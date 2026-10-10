export type MessageStatus = "sent" | "delivered" | "read";

export class Message {
  constructor(
    public readonly id: string,
    public readonly senderId: string,
    public readonly receiverId: string | null,
    public readonly groupId: string | null,
    public readonly text: string | null,
    public readonly image: string | null,
    public readonly status: MessageStatus,
    public readonly readAt: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}
