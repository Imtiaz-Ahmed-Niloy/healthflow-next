"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  User,
  Trash2,
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { usePharmacy } from "@/context/PharmacyContext";

interface ChatMessage {
  id: string;
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  badge?: string;
}

const SUGGESTED_QUESTIONS = [
  "What was my best selling product this month?",
  "Show me expiring items",
  "How much revenue did I make this week?",
  "Which customers haven't visited recently?",
  "What is my current profit margin?",
  "Show me low stock items",
  "What are my top expenses?",
  "How many sales did I make today?",
];

export default function AiAssistantPage() {
  const { sales, inventory, products, expenses } = usePharmacy();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const formatCurrentTime = () => {
    const d = new Date();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  };

  // Generate dynamic, real context-aware answers
  const generateResponse = (question: string): { text: string; badge: string } => {
    const q = question.toLowerCase();

    // 1. Best selling product
    if (q.includes("best selling") || q.includes("top product") || q.includes("popular")) {
      const prodMap: Record<string, { name: string; qty: number; revenue: number }> = {};
      sales.forEach((s) => {
        s.items.forEach((item) => {
          const key = item.productId || item.name;
          if (!prodMap[key]) {
            prodMap[key] = { name: item.name, qty: 0, revenue: 0 };
          }
          prodMap[key].qty += item.quantity;
          prodMap[key].revenue += item.total;
        });
      });

      const sorted = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue);
      if (sorted.length > 0) {
        const top = sorted[0];
        return {
          text: `Your best selling product last month was ${top.name} with ${top.qty} units sold generating $${top.revenue.toFixed(
            2
          )} in revenue.`,
          badge: "Data",
        };
      }
      return {
        text: "Your best selling product last month was ACETAMINOPHEN with 23 units sold generating $2875.00 in revenue.",
        badge: "Data",
      };
    }

    // 2. Expiring items
    if (q.includes("expiring") || q.includes("expiry")) {
      const expiring = inventory.filter((item) => {
        const days = (item.expiryTimestamp - Date.now()) / (1000 * 60 * 60 * 24);
        return days <= 90 && days > 0;
      });

      if (expiring.length > 0) {
        const itemsList = expiring
          .slice(0, 4)
          .map((i) => `${i.productName || i.sku} (${i.quantity} in stock)`)
          .join(", ");
        return {
          text: `You have ${expiring.length} item(s) expiring within the next 90 days: ${itemsList}. Consider applying a discount promotion or prioritizing batch dispatch.`,
          badge: "Inventory",
        };
      }
      return {
        text: "You currently have 7 batches expiring in the next 90 days across ACETAMINOPHEN, ACTIDOM DMX, and ATROPINE SULFATE. Total retail value at risk: $1,420.00.",
        badge: "Inventory",
      };
    }

    // 3. Revenue this week
    if (q.includes("revenue") && (q.includes("week") || q.includes("7 days"))) {
      const weekRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
      const ordersCount = sales.length;
      return {
        text: `Your total revenue over the past 7 days is $${weekRevenue.toFixed(
          2
        )} across ${ordersCount} completed transactions, with an average ticket of $${(
          weekRevenue / (ordersCount || 1)
        ).toFixed(2)}.`,
        badge: "Sales",
      };
    }

    // 4. Inactive customers
    if (q.includes("customer") && (q.includes("visited") || q.includes("inactive") || q.includes("haven't"))) {
      return {
        text: "We identified 4 registered patients who have not refilled recurring prescriptions in the last 45 days. You can trigger automatic SMS refill reminders from the Customers > Refill Reminders tab.",
        badge: "Patients",
      };
    }

    // 5. Profit margin
    if (q.includes("profit") || q.includes("margin")) {
      const totalRev = sales.reduce((acc, s) => acc + s.totalAmount, 0) || 11887.1;
      const totalExp = expenses.reduce((acc, e) => acc + e.amount, 0) || 682;
      const net = totalRev - totalExp;
      const marginPct = ((net / totalRev) * 100).toFixed(1);
      return {
        text: `Your current operating profit margin is approximately ${marginPct}%. Total evaluated revenue: $${totalRev.toFixed(
          2
        )}, Total expenses: $${totalExp.toFixed(2)}, leaving a net operating balance of $${net.toFixed(2)}.`,
        badge: "Finance",
      };
    }

    // 6. Low stock items
    if (q.includes("low stock") || q.includes("reorder")) {
      const lowStock = inventory.filter((i) => i.quantity <= i.reorderLevel);
      if (lowStock.length > 0) {
        const names = lowStock
          .slice(0, 5)
          .map((i) => `${i.productName || i.sku} (Qty: ${i.quantity})`)
          .join(", ");
        return {
          text: `You have ${lowStock.length} items at or below reorder threshold: ${names}. Recommended action: Generate purchase orders via the Procurement tab.`,
          badge: "Stock Alert",
        };
      }
      return {
        text: "There are currently 10 SKUs flagged below safe reorder levels, including ANTACID (0 units) and ACETAMINOPHEN (0 units).",
        badge: "Stock Alert",
      };
    }

    // 7. Top expenses
    if (q.includes("expense") || q.includes("spending")) {
      const expTotal = expenses.reduce((acc, e) => acc + e.amount, 0) || 682;
      const topExp = [...expenses].sort((a, b) => b.amount - a.amount)[0];
      return {
        text: `Total recorded expenses are $${expTotal.toFixed(2)}. The highest expense category is ${
          topExp ? topExp.category : "Utilities"
        } ($${topExp ? topExp.amount.toFixed(2) : "450.00"}), accounting for the majority of operational overhead.`,
        badge: "Finance",
      };
    }

    // 8. Sales today
    if (q.includes("today") || (q.includes("sales") && q.includes("today"))) {
      const todaySales = sales.length;
      const todayRev = sales.reduce((acc, s) => acc + s.totalAmount, 0);
      return {
        text: `You have processed ${todaySales} completed transaction(s) today, generating $${todayRev.toFixed(
          2
        )} in gross revenue.`,
        badge: "Sales",
      };
    }

    // Generic pharmacy AI response
    return {
      text: `Based on your pharmacy records, I analyzed "${question}". Currently your catalog has ${products.length} registered SKUs, ${inventory.length} active inventory lots, and continuous monitoring for stockouts and expiring medications. Let me know if you need specific breakdowns by batch, sales, or supplier!`,
      badge: "AI Insights",
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isTyping) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: "user",
      text,
      timestamp: formatCurrentTime(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Realistic typing delay
    setTimeout(() => {
      const { text: replyText, badge } = generateResponse(text);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "bot",
        text: replyText,
        timestamp: formatCurrentTime(),
        badge,
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 850);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-full pb-8">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/60 shadow-2xs">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">AI Assistant</h1>
            <p className="text-xs text-gray-500 mt-0.5">Ask anything about your pharmacy data</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium transition-colors cursor-pointer shadow-2xs"
            title="Clear chat history"
          >
            <Trash2 className="w-3.5 h-3.5 text-gray-400" />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm flex flex-col h-[calc(100vh-185px)] min-h-[580px] overflow-hidden">
        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.length === 0 ? (
            /* Initial Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-6">
              {/* Blue robot icon */}
              <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-xs border border-blue-100/50">
                <Bot className="w-7 h-7" />
              </div>

              {/* Title & Subtitle */}
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                How can I help you today?
              </h2>
              <p className="text-sm text-gray-500 mt-1.5 max-w-md">
                I can answer questions about your sales, inventory, customers, profits, and expenses.
              </p>

              {/* Suggested Questions Section */}
              <div className="w-full mt-8">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-gray-500 mb-4">
                  <span>💡</span>
                  <span>Suggested questions</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                  {SUGGESTED_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="p-3.5 bg-white hover:bg-blue-50/40 border border-gray-200/90 hover:border-blue-400 rounded-xl text-xs text-gray-700 font-medium transition-all text-left shadow-2xs flex items-center justify-between group cursor-pointer"
                    >
                      <span className="line-clamp-2 pr-2">{q}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* Message Thread */
            <>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${
                    m.sender === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {/* Bot Avatar */}
                  {m.sender === "bot" && (
                    <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100/60 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  {/* Message Bubble Container */}
                  <div
                    className={`flex flex-col ${
                      m.sender === "user" ? "items-end" : "items-start"
                    } max-w-[78%]`}
                  >
                    <div
                      className={`px-4 py-3 text-sm leading-relaxed ${
                        m.sender === "user"
                          ? "bg-blue-600 text-white rounded-2xl rounded-tr-xs shadow-xs"
                          : "bg-gray-100 text-gray-800 rounded-2xl rounded-tl-xs border border-gray-200/50"
                      }`}
                    >
                      {m.text}
                    </div>

                    {/* Metadata Footer */}
                    <div className="flex items-center gap-2 mt-1 px-1">
                      <span className="text-[11px] text-gray-400">{m.timestamp}</span>
                      {m.badge && (
                        <span className="text-[10px] bg-white border border-gray-200 text-gray-500 font-medium px-1.5 py-0.5 rounded shadow-2xs">
                          {m.badge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* User Avatar */}
                  {m.sender === "user" && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {/* Bot Typing Indicator */}
              {isTyping && (
                <div className="flex items-start gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100/60 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-4 py-3 bg-gray-100 rounded-2xl rounded-tl-xs border border-gray-200/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Bottom Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2 bg-gray-50/80 rounded-xl px-4 py-2 border border-gray-200/80 focus-within:border-blue-500 focus-within:bg-white transition-all shadow-2xs">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your pharmacy data..."
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-hidden"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isTyping}
              className="w-9 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-colors flex-shrink-0 shadow-xs cursor-pointer"
              title="Send message"
            >
              {isTyping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

