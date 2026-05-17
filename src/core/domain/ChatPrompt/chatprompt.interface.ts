export interface ChatPromptRequest {
  sessionId?: string;
  prompt: string;
  model: string;
}

export interface ChatPromptResponse {
  sessionId: string;
  assistantMessage: string;
}

