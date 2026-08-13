"use client";

import { useState } from "react";
import { Toaster } from "react-hot-toast";
import { Web3Provider } from "@/context/Web3Context";
import { Navbar } from "@/components/navbar";
import { MyCollection } from "@/components/my-collection";
import { AdminDashboard } from "@/components/admin-dashboard";
import { Layers, Shield } from "lucide-react";

type Tab = "collection" | "admin";

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300
        ${
          active
            ? "text-primary-foreground bg-primary shadow-lg shadow-primary/25"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
        }
      `}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
      {active && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-full blur-sm" />
      )}
    </button>
  );
}

function MainContent() {
  const [activeTab, setActiveTab] = useState<Tab>("collection");

  return (
    <div className="min-h-screen bg-background">
      {/* Ambient background effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-chart-2/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-chart-3/5 rounded-full blur-3xl" />
      </div>

      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-4">
            <span className="text-primary">POAP</span> Hub
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Collect and showcase your proof of attendance badges. Create memorable
            experiences and reward your community.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl glass">
            <TabButton
              active={activeTab === "collection"}
              onClick={() => setActiveTab("collection")}
              icon={Layers}
              label="My Collection"
            />
            <TabButton
              active={activeTab === "admin"}
              onClick={() => setActiveTab("admin")}
              icon={Shield}
              label="Admin Dashboard"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-300">
          {activeTab === "collection" ? <MyCollection /> : <AdminDashboard />}
        </div>
      </main>

      {/* Toast Container */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          duration: 5000,
          style: {
            background: "oklch(0.10 0.025 280)",
            color: "oklch(0.98 0 0)",
            border: "1px solid oklch(0.22 0.04 280)",
            borderRadius: "12px",
            backdropFilter: "blur(20px)",
          },
          success: {
            iconTheme: {
              primary: "oklch(0.65 0.2 145)",
              secondary: "oklch(0.98 0 0)",
            },
          },
          error: {
            iconTheme: {
              primary: "oklch(0.55 0.2 25)",
              secondary: "oklch(0.98 0 0)",
            },
          },
          loading: {
            iconTheme: {
              primary: "oklch(0.65 0.25 285)",
              secondary: "oklch(0.98 0 0)",
            },
          },
        }}
      />
    </div>
  );
}

export default function Home() {
  return (
    <Web3Provider>
      <MainContent />
    </Web3Provider>
  );
}
