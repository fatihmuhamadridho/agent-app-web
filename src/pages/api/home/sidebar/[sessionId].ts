import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatHistoryController } from '@core/domain/ChatHistory/chathistory.controller';
import type { ChatHistoryResponse } from '@core/domain/ChatHistory/chathistory.interface';

const chatHistoryController = new ChatHistoryController();

export default async function handler(req: NextApiRequest, res: NextApiResponse<ChatHistoryResponse.getChatHistory>) {
  const { sessionId } = req.query;
  const selectedSessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;
  const { limit, beforeIndex } = req.query;
  const selectedLimit = Number(Array.isArray(limit) ? limit[0] : limit);
  const selectedBeforeIndex = Number(Array.isArray(beforeIndex) ? beforeIndex[0] : beforeIndex);

  if (!selectedSessionId) {
    res.status(400).json({ sessionId: '', title: '', messages: [], totalMessages: 0, hasMoreBefore: false, nextBeforeIndex: null });
    return;
  }

  try {
    const data = await chatHistoryController.getChatHistory({
      sessionId: selectedSessionId,
      limit: Number.isFinite(selectedLimit) ? selectedLimit : undefined,
      beforeIndex: Number.isFinite(selectedBeforeIndex) ? selectedBeforeIndex : undefined,
    });
    res.status(200).json(data);
  } catch {
    res.status(500).json({
      sessionId: selectedSessionId,
      title: selectedSessionId,
      messages: [],
      totalMessages: 0,
      hasMoreBefore: false,
      nextBeforeIndex: null,
    });
  }
}
