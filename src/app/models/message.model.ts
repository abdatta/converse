export interface Message {
    message: string;
    username: string;
    user_id: string;
    timestamp: number;
    reply_to?: Message;
}
