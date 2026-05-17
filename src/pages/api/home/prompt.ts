import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatPromptController } from '@core/domain/ChatPrompt/chatprompt.controller';
import type { ChatPromptResponse } from '@core/domain/ChatPrompt/chatprompt.interface';

const chatPromptController = new ChatPromptController();

export default async function handler(req: NextApiRequest, res: NextApiResponse<ChatPromptResponse>) {
  if (req.method !== 'POST') {
    res.status(405).json({ sessionId: '', assistantMessage: '' });
    return;
  }

  try {
    const { sessionId, prompt, model } = req.body as {
      sessionId?: string;
      prompt?: string;
      model?: string;
    };

    if (!prompt?.trim() || !model?.trim()) {
      res.status(400).json({ sessionId: '', assistantMessage: '' });
      return;
    }

    const data = await chatPromptController.sendPrompt({
      sessionId,
      prompt: prompt.trim(),
      model: model.trim(),
    });

    res.status(200).json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to send prompt';
    res.status(500).json({ sessionId: '', assistantMessage: message });
  }
}
