export interface ApiResponse<T> {
    statusCode: number;
    message: string;
    data: T | null;
    chatId?: string;
}
