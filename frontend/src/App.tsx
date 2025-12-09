import { useEffect, useState, useRef } from "react";
import { Upload, Download, RefreshCw, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ModelInfo {
  id: string;
  name: string;
}

interface PromptsResponse {
  system_prompt: string;
  user_prompt: string;
}

interface RandomImageResponse {
  image: string;
}

export default function App() {
  // State
  const [mllmModels, setMllmModels] = useState<ModelInfo[]>([]);
  const [genModels, setGenModels] = useState<ModelInfo[]>([]);
  const [selectedMllm, setSelectedMllm] = useState<string>("");
  const [selectedGenModel, setSelectedGenModel] = useState<string>("");
  
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRandomLoading, setIsRandomLoading] = useState(false);
  
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [mllmStatus, setMllmStatus] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const analyzeAbortController = useRef<AbortController | null>(null);
  const generateAbortController = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatedImageRef = useRef<HTMLDivElement>(null);

  // Initial Load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const modelsRes = await fetch("/api/models");
        const modelsData = await modelsRes.json();
        setMllmModels(modelsData.mllm_models);
        setGenModels(modelsData.generation_models);
        if (modelsData.mllm_models.length > 0) setSelectedMllm(modelsData.mllm_models[0].id);
        if (modelsData.generation_models.length > 0) setSelectedGenModel(modelsData.generation_models[0].id);

        const promptsRes = await fetch("/api/prompts");
        const promptsData: PromptsResponse = await promptsRes.json();
        setSystemPrompt(promptsData.system_prompt);
        setUserPrompt(promptsData.user_prompt);
      } catch (e) {
        console.error("Failed to load generic data", e);
      }
    };
    fetchData();
  }, []);

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRandomImage = async () => {
    try {
      setIsRandomLoading(true);
      const res = await fetch("/api/random-image");
      if (!res.ok) throw new Error("Failed to fetch random image");
      const data: RandomImageResponse = await res.json();
      setPreviewImage(data.image);
    } catch (e) {
      console.error(e);
      alert("Failed to load random image");
    } finally {
      setIsRandomLoading(false);
    }
  };

  const handleAnalysis = async () => {
    if (isAnalyzing && analyzeAbortController.current) {
      analyzeAbortController.current.abort();
      analyzeAbortController.current = null;
      setIsAnalyzing(false);
      setMllmStatus("Cancelled");
      return;
    }

    if (!previewImage) return;

    analyzeAbortController.current = new AbortController();
    setIsAnalyzing(true);
    setGeneratedPrompt("");
    setMllmStatus("Receiving stream output...");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: previewImage,
          model: selectedMllm,
          system_prompt: systemPrompt,
          user_prompt: userPrompt,
        }),
        signal: analyzeAbortController.current.signal,
      });

      if (!response.ok) throw new Error(response.statusText);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const content = line.slice(6);
            if (content.startsWith("{'error':")) {
              setGeneratedPrompt((prev) => prev + "\nError: " + content);
            } else {
              try {
                if (content.trim() === "[DONE]") continue;
                const data = JSON.parse(content);
                const text = data.choices?.[0]?.delta?.content || "";
                if (text) {
                  setGeneratedPrompt((prev) => prev + text);
                }
              } catch (e) {
                console.log("Stream parse error", e);
              }
            }
          }
        }
      }
      setMllmStatus("Analysis complete");
    } catch (err: any) {
      if (err.name === "AbortError") {
        setMllmStatus("Cancelled");
      } else {
        console.error(err);
        setMllmStatus("Error: " + err.message);
      }
    } finally {
      setIsAnalyzing(false);
      analyzeAbortController.current = null;
    }
  };

  const handleGeneration = async () => {
    if (isGenerating && generateAbortController.current) {
      generateAbortController.current.abort();
      generateAbortController.current = null;
      setIsGenerating(false);
      setGenError("Cancelled");
      return;
    }

    if (!generatedPrompt) return;

    generateAbortController.current = new AbortController();
    setIsGenerating(true);
    setGeneratedImage(null);
    setGenError(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: generatedPrompt,
          model: selectedGenModel,
        }),
        signal: generateAbortController.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Generation failed");
      }

      const data = await response.json();
      setGeneratedImage(data.image);
      
      // Auto-scroll
      setTimeout(() => {
        generatedImageRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err: any) {
      if (err.name === "AbortError") {
        setGenError("Cancelled");
      } else {
        console.error(err);
        setGenError(err.message || "Generation failed");
      }
    } finally {
      setIsGenerating(false);
      generateAbortController.current = null;
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const a = document.createElement("a");
    a.href = generatedImage;
    a.download = "generated-image.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="min-h-screen bg-background p-4 font-sans text-foreground">
      <div className="mx-auto max-w-[1700px] flex flex-col">
        <header className="mb-4 flex items-center gap-4 border-b border-border/50 pb-4">
          <h1 className="text-xl font-bold tracking-tight">ReImage</h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Column 1 */}
          <Card className="flex flex-col shadow-none border rounded-[4px]">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-transparent py-4 px-6 space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">1. Image Source & Config</CardTitle>
              <Button 
                variant={isAnalyzing ? "destructive" : "default"} 
                size="sm" 
                onClick={handleAnalysis}
                disabled={!previewImage}
                className="uppercase font-bold tracking-wider text-xs rounded-sm"
              >
                {isAnalyzing ? "Stop Analysis" : "Start Analysis"}
              </Button>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 p-6 bg-card/50">

              {/* Models */}
              <div className="space-y-2">
                <Label className="uppercase text-muted-foreground tracking-wide text-xs">Analysis Model (Multimodal LM)</Label>
                <Select value={selectedMllm} onValueChange={setSelectedMllm}>
                  <SelectTrigger className="bg-background border-input rounded-sm">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {mllmModels.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prompts */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                    <Label className="text-xs uppercase text-muted-foreground tracking-wide">System Prompt</Label>
                    <Textarea 
                        value={systemPrompt} 
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="min-h-[150px] font-mono text-xs resize-y bg-background rounded-sm border-input"
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <Label className="text-xs uppercase text-muted-foreground tracking-wide">User Prompt</Label>
                    <Textarea 
                        value={userPrompt} 
                        onChange={(e) => setUserPrompt(e.target.value)}
                        className="min-h-[150px] font-mono text-xs resize-y bg-background rounded-sm border-input"
                    />
                </div>
              </div>
              
              {/* Image Upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="uppercase text-muted-foreground tracking-wide text-xs">Original Image</Label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs uppercase font-bold tracking-wider rounded-sm bg-transparent" 
                    onClick={handleRandomImage}
                    disabled={isRandomLoading}
                  >
                    {isRandomLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <RefreshCw className="mr-2 h-3 w-3" />}
                    Random
                  </Button>
                </div>

                <div 
                  className={`
                    relative flex min-h-[300px] flex-col items-center justify-center rounded-sm border-2 border-dashed 
                    transition-colors hover:bg-accent/50 cursor-pointer bg-background
                    ${previewImage ? 'border-primary/50' : 'border-muted-foreground/25'}
                  `}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-primary"); }}
                  onDragLeave={(e) => { e.currentTarget.classList.remove("border-primary"); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("border-primary");
                    if (e.dataTransfer.files?.[0]) {
                        const file = e.dataTransfer.files[0];
                        if (file.type.startsWith('image/')) {
                            const reader = new FileReader();
                            reader.onload = (ev) => setPreviewImage(ev.target?.result as string);
                            reader.readAsDataURL(file);
                        }
                    }
                  }}
                >
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="max-h-[500px] w-full object-contain rounded-sm" />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground">
                      <Upload className="mb-2 h-8 w-8 opacity-50" />
                      <span className="text-sm font-bold uppercase tracking-wide">Click or Drag to Upload</span>
                    </div>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>

          {/* Column 2 */}
          <Card className="flex flex-col shadow-none border rounded-[4px]">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-transparent py-4 px-6 space-y-0">
              <CardTitle className="text-sm font-bold uppercase tracking-wider">2. Prompt Generation & Image Gen</CardTitle>
              <div className="flex gap-2">
                {generatedImage && (
                  <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 text-xs uppercase font-bold tracking-wider rounded-sm bg-transparent">
                    <Download className="mr-2 h-3 w-3" /> Download
                  </Button>
                )}
                <Button 
                    variant={isGenerating ? "destructive" : "default"} 
                    size="sm" 
                    onClick={handleGeneration}
                    disabled={!generatedPrompt || isAnalyzing}
                    className="uppercase font-bold tracking-wider text-xs rounded-sm"
                >
                    {isGenerating ? "Cancel Generation" : "Generate Image"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 p-6 bg-card/50">
              
              {/* Generated Prompt */}
              <div className="space-y-2 flex-grow-[0] flex-shrink-0">
                <div className="flex justify-between items-center">
                    <Label className="uppercase text-muted-foreground tracking-wide text-xs">Generated Prompt</Label>
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">{mllmStatus}</span>
                </div>
                <Textarea 
                    value={generatedPrompt} 
                    onChange={(e) => setGeneratedPrompt(e.target.value)}
                    className="min-h-[180px] font-mono text-sm resize-y bg-background rounded-sm border-input"
                    placeholder="Prompt will appear here..."
                />
              </div>

              <div className="space-y-2">
                <Label className="uppercase text-muted-foreground tracking-wide text-xs">Generation Model</Label>
                <Select value={selectedGenModel} onValueChange={setSelectedGenModel}>
                  <SelectTrigger className="bg-background border-input rounded-sm">
                    <SelectValue placeholder="Select model" />
                  </SelectTrigger>
                  <SelectContent>
                    {genModels.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Result */}
              <div className="space-y-2 flex-1 flex flex-col min-h-0">
                 <Label className="uppercase text-muted-foreground tracking-wide text-xs">3. Results</Label>
                 <div className="flex-1 min-h-[300px] border-2 border-dashed rounded-sm flex flex-col items-center justify-center bg-background relative p-4">
                 
                    {isGenerating && (
                        <div className="absolute inset-0 z-10 bg-background/80 flex items-center justify-center">
                            <Loader2 className="h-10 w-10 animate-spin text-primary" />
                        </div>
                    )}

                    {generatedImage ? (
                        <img 
                            ref={generatedImageRef}
                            src={generatedImage} 
                            alt="Generated" 
                            className="max-w-full max-h-full object-contain rounded-sm shadow-sm" 
                        />
                    ) : (
                        <div className="text-center text-muted-foreground p-8">
                            {genError ? (
                                <p className="text-destructive font-bold uppercase tracking-wide text-sm">{genError}</p>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <ImageIcon className="mb-2 h-10 w-10 opacity-20" />
                                    <p className="text-sm font-bold uppercase tracking-wide opacity-50">Waiting for generation...</p>
                                </div>
                            )}
                        </div>
                    )}
                 </div>
              </div>

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
