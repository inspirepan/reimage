import { useEffect, useState, useRef } from "react";
import { Upload, Download, RefreshCw, Loader2, Image as ImageIcon, Check, ChevronDown, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

interface GenerationResult {
    id: string;
    modelId: string;
    modelName: string;
    status: 'pending' | 'success' | 'error';
    image?: string;
    error?: string;
}

export default function App() {
  // State
  const [mllmModels, setMllmModels] = useState<ModelInfo[]>([]);
  const [genModels, setGenModels] = useState<ModelInfo[]>([]);
  const [selectedMllm, setSelectedMllm] = useState<string>("");
  
  // Multi-select state: modelId -> count (if present, it is selected)
  const [selectedGenModels, setSelectedGenModels] = useState<Record<string, number>>({});
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");
  
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isRandomLoading, setIsRandomLoading] = useState(false);
  
  const [generatedPrompt, setGeneratedPrompt] = useState<string>("");
  const [mllmStatus, setMllmStatus] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Generation Results
  const [genResults, setGenResults] = useState<GenerationResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const analyzeAbortController = useRef<AbortController | null>(null);
  const generateAbortController = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
        if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
            setIsModelDropdownOpen(false);
        }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Initial Load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const modelsRes = await fetch("/api/models");
        const modelsData = await modelsRes.json();
        setMllmModels(modelsData.mllm_models);
        setGenModels(modelsData.generation_models);
        
        if (modelsData.mllm_models.length > 0) setSelectedMllm(modelsData.mllm_models[0].id);
        
        // Default select first gen model
        if (modelsData.generation_models.length > 0) {
            setSelectedGenModels({ [modelsData.generation_models[0].id]: 1 });
        }

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

  const toggleModel = (modelId: string) => {
      setSelectedGenModels(prev => {
          const next = { ...prev };
          if (next[modelId]) {
              delete next[modelId];
          } else {
              next[modelId] = 1;
          }
          return next;
      });
  };

  const updateModelCount = (modelId: string, count: number) => {
      setSelectedGenModels(prev => ({
          ...prev,
          [modelId]: count
      }));
  };

  const handleGeneration = async () => {
    if (isGenerating && generateAbortController.current) {
      generateAbortController.current.abort();
      generateAbortController.current = null;
      setIsGenerating(false);
      return;
    }

    if (!generatedPrompt) return;

    // Prepare tasks
    const newTasks: GenerationResult[] = [];
    Object.entries(selectedGenModels).forEach(([modelId, count]) => {
        const model = genModels.find(m => m.id === modelId);
        if (!model) return;
        for(let i=0; i<count; i++) {
            newTasks.push({
                id: crypto.randomUUID(),
                modelId,
                modelName: model.name,
                status: 'pending'
            });
        }
    });

    if (newTasks.length === 0) {
        alert("Please select at least one model");
        return;
    }

    generateAbortController.current = new AbortController();
    setIsGenerating(true);
    // Append new results to start of list? or Replace? User said "Compare multiple generation results".
    // Usually replacing or prepending is better. Let's replace for a fresh run, but maybe we should allow clearing.
    // Let's replace to keep it clean like the previous single-image version. 
    setGenResults(newTasks); 

    // Auto-scroll
    setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    const signal = generateAbortController.current.signal;

    const promises = newTasks.map(async (task) => {
        try {
            const response = await fetch("/api/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: generatedPrompt,
                    model: task.modelId,
                }),
                signal,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || "Generation failed");
            }

            const data = await response.json();
            
            setGenResults(prev => prev.map(p => 
                p.id === task.id ? { ...p, status: 'success', image: data.image } : p
            ));

        } catch (err: any) {
             if (err.name === "AbortError") {
                 setGenResults(prev => prev.map(p => 
                    p.id === task.id ? { ...p, status: 'error', error: "Cancelled" } : p
                ));
             } else {
                 setGenResults(prev => prev.map(p => 
                    p.id === task.id ? { ...p, status: 'error', error: err.message || "Failed" } : p
                ));
             }
        }
    });

    try {
        await Promise.all(promises);
    } finally {
        setIsGenerating(false);
        generateAbortController.current = null;
    }
  };

  const downloadImage = (imageUrl: string, prefix: string) => {
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${prefix}-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getSelectionLabel = () => {
      const selectedIds = Object.keys(selectedGenModels);
      if (selectedIds.length === 0) return "Select models...";
      if (selectedIds.length === 1) {
          const model = genModels.find(m => m.id === selectedIds[0]);
          return model ? model.name : "Unknown model";
      }
      return `${selectedIds.length} models selected`;
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
                <Button 
                    variant={isGenerating ? "destructive" : "default"} 
                    size="sm" 
                    onClick={handleGeneration}
                    disabled={!generatedPrompt || isAnalyzing}
                    className="uppercase font-bold tracking-wider text-xs rounded-sm"
                >
                    {isGenerating ? "Cancel Generation" : "Generate Images"}
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

              {/* Multi-Select Generation Models */}
              <div className="space-y-2" ref={modelDropdownRef}>
                <Label className="uppercase text-muted-foreground tracking-wide text-xs">Generation Models</Label>
                <div className="relative">
                    <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between bg-background border-input rounded-sm font-normal"
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                    >
                        {getSelectionLabel()}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                    
                    {isModelDropdownOpen && (
                        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
                            <div className="p-1 max-h-60 overflow-auto">
                                {genModels.map(model => (
                                    <div 
                                        key={model.id} 
                                        className="relative flex items-center justify-between rounded-sm py-1.5 pl-2 pr-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
                                        onClick={() => toggleModel(model.id)}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`
                                                flex h-4 w-4 items-center justify-center rounded-sm border border-primary
                                                ${selectedGenModels[model.id] ? "bg-primary text-primary-foreground" : "opacity-50"}
                                            `}>
                                                {selectedGenModels[model.id] && <Check className="h-3 w-3" />}
                                            </div>
                                            <span>{model.name}</span>
                                        </div>
                                        
                                        {selectedGenModels[model.id] && (
                                            <select 
                                                className="h-6 w-16 text-xs bg-background border rounded px-1 ml-2 z-50"
                                                value={selectedGenModels[model.id]}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    updateModelCount(model.id, parseInt(e.target.value));
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {[1, 2, 3, 4].map(n => (
                                                    <option key={n} value={n}>{n}x</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              </div>

              {/* Result Area */}
              <div className="space-y-2 flex-1 flex flex-col min-h-0">
                 <div className="flex justify-between items-center">
                    <Label className="uppercase text-muted-foreground tracking-wide text-xs">3. Results</Label>
                    {genResults.length > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setGenResults([])} 
                            className="h-6 text-xs text-muted-foreground"
                        >
                            <Trash2 className="mr-1 h-3 w-3" /> Clear
                        </Button>
                    )}
                 </div>
                 
                 <div 
                    ref={resultsRef} 
                    className="flex-1 min-h-[300px] border-2 border-dashed rounded-sm bg-background p-4 overflow-y-auto"
                 >
                    {genResults.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                            <ImageIcon className="mb-2 h-10 w-10 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-wide opacity-50">Waiting for generation...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {genResults.map((result) => (
                                <div key={result.id} className="group relative rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
                                    <div className="flex items-center justify-between border-b px-3 py-2 bg-muted/30">
                                        <span className="text-xs font-medium truncate" title={result.modelName}>{result.modelName}</span>
                                        {result.status === 'success' && result.image && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-6 w-6" 
                                                onClick={() => downloadImage(result.image!, result.modelName)}
                                            >
                                                <Download className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="aspect-square relative flex items-center justify-center bg-zinc-100 dark:bg-zinc-900">
                                        {result.status === 'pending' && (
                                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                        )}
                                        {result.status === 'error' && (
                                            <div className="text-xs text-destructive p-2 text-center">
                                                {result.error}
                                            </div>
                                        )}
                                        {result.status === 'success' && result.image && (
                                            <img 
                                                src={result.image} 
                                                alt={result.modelName} 
                                                className="w-full h-full object-contain"
                                                loading="lazy"
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
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
