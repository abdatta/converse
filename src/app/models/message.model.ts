export interface User {
    username: string;
    user_id: string;
}

export interface Message extends User {
    message: string;
    timestamp: number;
    reply_to?: Message;
}
