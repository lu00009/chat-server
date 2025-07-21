// types/chat.ts

export enum MessageType {
    TEXT = "TEXT",
    IMAGE = "IMAGE",
    VIDEO = "VIDEO",
    FILE = "FILE",
    // Add other message types as needed
}

export interface SendMessageBody {
    content?: string;
    senderId: string;
    groupId: string;
    type: MessageType;
    replyToId?: string;
    // Potentially add mediaUrl here if you want to explicitly type it in the body for non-file uploads
}

export interface UpdateMessageBody {
    newContent: string;
}

export interface ReactionBody {
    userId: string;
    emoji: string;
}

export interface SeenBody {
    userId: string;
}