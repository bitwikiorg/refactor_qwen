import { Model } from 'mongoose';
import { injectable } from '../../../di-container';
import type { IMessage } from '../../types';

@injectable()
export default class MessageDBRepo {
    private MessageModel!: Model<IMessage>;
    private RoomModel!: Model;

    async init() {
        const msgSchema = new Schema({
            content: String,
            senderId: String,
            roomId: String,
            timestamp: Date
        });
        this.MessageModel = mongoose.model('Message', msgSchema);

        const roomSchema = new Schema({
            id: String,
            name: String,
            ownerId: String,
            membersIds: [String]
        });
        this.RoomModel = mongoose.model('Rooms', roomSchema);
    }

    async saveMessage(msgData): Promise {
        return await this.MessageModel.create(msgData);
    }

    async getMessagesByRoom(roomId): Promise {
        return await this.MessageModel.find({ roomId }).sort({ timestamp: -1 });
    }

    async createNewRoom(roomData): Promise {
        const newRm = await this.RoomModel.create(roomData);
        return await newRm.save();
    }
}