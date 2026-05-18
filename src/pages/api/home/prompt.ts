import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatPromptDatasource } from '@core/infrastructure/ChatPrompt/chatprompt.datasource';
import type { ChatPromptRequest } from '@core/domain/ChatPrompt/chatprompt.interface';

const chatPromptDatasource = new ChatPromptDatasource();

type EnqueueResponse = {
  jobId: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<EnqueueResponse>) {

  if (req.method !== 'POST') {
    res.status(405).json({ jobId: '' });
    return;
  }

  try {
    const { sessionId, prompt, model } = req.body as {
      sessionId?: string;
      prompt?: string;
      model?: string;
      images?: string[];
    };

    if (!prompt?.trim() || !model?.trim()) {
      res.status(400).json({ jobId: '' });
      return;
    }

    const data = chatPromptDatasource.enqueue({
      sessionId,
      prompt: prompt.trim(),
      model: model.trim(),
      images: Array.isArray(req.body?.images) ? req.body.images : undefined,
    } satisfies ChatPromptRequest);

    res.status(200).json(data);
  } catch {
    res.status(500).json({ jobId: '' });
  }
}
