import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, Bot, FileText, Blocks, BarChart2, Map, Search, Wrench, BrainCircuit } from "lucide-react";
import { SAGE_MODES, type SageMode, cn } from "@/lib/utils";
import { useGetCourses } from "@workspace/api-client-react";

interface ComposerProps {
  onSend: (message: string, mode: SageMode, course: string) => void;
  disabled: boolean;
  selectedMode?: SageMode;
  onModeChange?: (mode: SageMode) => void;
}

export function Composer({ onSend, disabled, selectedMode, onModeChange }: ComposerProps) {
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<SageMode>("general");
  const [course, setCourse] = useState("all");
  const [modeSelectorOpen, setModeSelectorOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  const { data: coursesData } = useGetCourses();
  const courses = ["all", ...(coursesData?.courses || [])];

  const currentModeObj = SAGE_MODES.find(m => m.id === mode)!;

  useEffect(() => {
    if (selectedMode && selectedMode !== mode) {
      setMode(selectedMode);
    }
  }, [selectedMode, mode]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px"; // reset
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.min(scrollHeight, 200) + "px";
    }
  }, [message]);

  // Click outside mode selector
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setModeSelectorOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim() && !disabled) {
        onSend(message.trim(), mode, course);
        setMessage("");
        if (textareaRef.current) textareaRef.current.style.height = "24px";
      }
    }
  };

  const getModeIcon = (id: string) => {
    switch(id) {
      case 'general': return <Bot className="w-4 h-4" />;
      case 'explain': return <FileText className="w-4 h-4" />;
      case 'quiz': return <Blocks className="w-4 h-4" />;
      case 'diagram': return <BarChart2 className="w-4 h-4" />;
      case 'roadmap': return <Map className="w-4 h-4" />;
      case 'research': return <Search className="w-4 h-4" />;
      case 'fix': return <Wrench className="w-4 h-4" />;
      case 'thinking': return <BrainCircuit className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const setModeAndNotify = (nextMode: SageMode) => {
    setMode(nextMode);
    onModeChange?.(nextMode);
  };

  return (
    <div className="relative w-full max-w-[780px] mx-auto">
      {/* Course & Mode Indicator */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <select 
          value={course} 
          onChange={(e) => setCourse(e.target.value)}
          disabled={disabled}
          className="bg-transparent text-xs text-muted-foreground hover:text-foreground font-medium outline-none cursor-pointer appearance-none"
        >
          <option value="all">All Courses</option>
          {courses.filter(c => c !== 'all').map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span className="text-border text-xs">•</span>
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          {getModeIcon(mode)} {currentModeObj.name} Mode
        </div>
      </div>

      <div className={cn(
        "relative flex items-end w-full rounded-[24px] bg-input border-2 transition-colors duration-200 shadow-lg shadow-black/20",
        disabled ? "border-border/50 opacity-60" : "border-border focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/10"
      )}>
        {/* Mode Selector Toggle */}
        <div className="relative p-2" ref={selectorRef}>
          <button
            onClick={() => !disabled && setModeSelectorOpen(!modeSelectorOpen)}
            disabled={disabled}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {getModeIcon(mode)}
          </button>

          <AnimatePresence>
            {modeSelectorOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-14 left-0 w-48 bg-sidebar border border-sidebar-border rounded-xl shadow-2xl overflow-hidden z-50 py-1"
              >
                {SAGE_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { setModeAndNotify(m.id as SageMode); setModeSelectorOpen(false); }}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 text-sm text-left transition-colors",
                      mode === m.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-white/5"
                    )}
                  >
                    <span className="text-base">{m.icon}</span>
                    <span className="font-medium">{m.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={currentModeObj.placeholder}
          className="flex-1 max-h-[200px] min-h-[24px] py-4 bg-transparent text-foreground placeholder:text-muted-foreground outline-none resize-none overflow-y-auto"
          rows={1}
        />

        {/* Send Button */}
        <div className="p-2">
          <button
            onClick={() => {
              if (message.trim() && !disabled) {
                onSend(message.trim(), mode, course);
                setMessage("");
                if (textareaRef.current) textareaRef.current.style.height = "24px";
              }
            }}
            disabled={disabled || !message.trim()}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-accent text-accent-foreground hover:bg-white hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all shadow-md"
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
