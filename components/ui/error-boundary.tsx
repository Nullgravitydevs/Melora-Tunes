"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-8 font-sans">
                    <div className="bg-zinc-900 border border-red-500/30 p-8 rounded-2xl max-w-2xl w-full shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-red-500/10 rounded-full">
                                <AlertTriangle className="text-red-500 w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-red-500">System Failure</h2>
                                <p className="text-zinc-400">The theme component crashed unexpectedly.</p>
                            </div>
                        </div>

                        <div className="bg-black/50 p-4 rounded-lg border border-white/5 font-mono text-sm text-red-300 overflow-auto max-h-64 mb-6">
                            <p className="font-bold mb-2">{this.state.error?.toString()}</p>
                            <pre className="text-zinc-500 text-xs whitespace-pre-wrap">
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </div>

                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null, errorInfo: null });
                                window.location.reload();
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                        >
                            <RefreshCcw size={18} />
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
