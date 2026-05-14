/**
 * ============================================================================
 * KNOWLEDGE BASE COMPONENT - Self-Service Article Browser
 * ============================================================================
 *
 * This component provides a searchable knowledge base for self-service support.
 * Users can browse articles organized by category and search for solutions.
 *
 * WHAT IT DOES:
 * - Displays searchable list of help articles
 * - Groups articles by category
 * - Allows expansion of articles to read full content
 * - Shows article metadata (views, tags, update time)
 * - Sanitizes HTML content for safe display
 *
 * KEY FEATURES:
 * - Full-text search across titles, content, and tags
 * - Category filtering with toggle buttons
 * - Expandable article cards
 * - View count tracking
 * - Tag display for related topics
 *
 * SANITIZATION:
 * - All HTML in article content is sanitized
 * - Prevents XSS attacks by escaping special characters
 * - Uses custom sanitizeHtml function for safety
 *
 * BEGINNER NOTES:
 * - Articles are fetched from /api/knowledge endpoint
 * - Search is client-side filtering (not server-side)
 * - Expanded state controlled by local state
 * - dangerouslySetInnerHTML is used with sanitization
 *
 * @module /components/KnowledgeBase
 */

"use client";

import { useState, useEffect } from "react";
import { Search, Book, ChevronRight, Clock, Eye, Tag } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Sanitizes HTML to prevent XSS attacks
 * 
 * WHAT IT DOES:
 * - Escapes HTML special characters
 * - Converts &, <, >, ", ' to safe entities
 * 
 * @param text - Raw text that may contain HTML
 * @returns Sanitized text safe for display
 */
function sanitizeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "\u0026amp;",
    "<": "\u0026lt;",
    ">": "\u0026gt;",
    '"': "\u0026quot;",
    "'": "\u0026#039;",
  };
  return text.replace(/[&<>"']/g, (char) => htmlEntities[char] || char);
}

interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  viewCount: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

interface KnowledgeBaseProps {
  onArticleClick?: (article: KnowledgeArticle) => void;
  onClose?: () => void;
}

/**
 * KnowledgeBase - Self-service help article browser modal
 *
 * @param onArticleClick - Optional callback when user clicks "View related tickets"
 * @param onClose - Callback to close the modal
 *
 * @example
 * <KnowledgeBase onClose={() => setShowKB(false)} />
 */
export function KnowledgeBase({ onArticleClick, onClose }: KnowledgeBaseProps) {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/knowledge");
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles || []);
        }
      } catch (error) {
        console.error("Error fetching knowledge base:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = Array.from(new Set(articles.map((a) => a.category)));

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      !search ||
      article.title.toLowerCase().includes(search.toLowerCase()) ||
      article.content.toLowerCase().includes(search.toLowerCase()) ||
      article.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      !selectedCategory || article.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <Book className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Knowledge Base</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-neutral-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <div className="p-4 border-b border-white/5">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                "px-3 py-1 text-xs rounded-full transition-colors",
                !selectedCategory
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10"
              )}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full transition-colors",
                  selectedCategory === category
                    ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                    : "bg-white/5 text-neutral-400 border border-white/10 hover:bg-white/10"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center text-neutral-500 py-8">Loading...</div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center text-neutral-500 py-8">
              No articles found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white/[0.03] border border-white/5 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() =>
                      setExpandedArticle(
                        expandedArticle === article.id ? null : article.id
                      )
                    }
                    className="w-full p-4 text-left hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-white font-medium mb-1">
                          {article.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {article.category}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.viewCount} views
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(parseISO(article.updatedAt))}{" "}
                            ago
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={cn(
                          "w-4 h-4 text-neutral-500 transition-transform",
                          expandedArticle === article.id && "rotate-90"
                        )}
                      />
                    </div>
                  </button>

                  {expandedArticle === article.id && (
                    <div className="px-4 pb-4 border-t border-white/5">
                      <div className="pt-4">
                        <div
                          className="text-sm text-neutral-300 whitespace-pre-wrap prose prose-invert max-w-none"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeHtml(article.content).replace(/\n/g, "<br/>"),
                          }}
                        />
                        {article.tags.length > 0 && (
                          <div className="flex gap-2 mt-4 flex-wrap">
                            {article.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-1 text-xs bg-white/5 text-neutral-400 rounded-full"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => onArticleClick?.(article)}
                          className="mt-4 text-sm text-blue-400 hover:text-blue-300"
                        >
                          View related tickets →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}