export interface ChatPromptRequest {
  sessionId?: string;
  prompt: string;
  model: string;
  images?: string[];
}

export interface ChatPromptResponse {
  sessionId: string;
  assistantMessage: string;
}
