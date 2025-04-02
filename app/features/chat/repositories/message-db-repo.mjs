import { Schema, model } from 'mongoose';

export default class MessageDBRepo {
  constructor() {
    const msgSchema = new Schema({
      content: String,
      senderId: String,
      roomId: String,
      timestamp: Date,
    });
    this.MessageModel = model('Message', msgSchema);

    const roomSchema = new Schema({
      id: String,
      name: String,
      ownerId: String,
      membersIds: [String],
    });
    this.RoomModel = model('Rooms', roomSchema);
  }

  async saveMessage(msgData) {
    return await this.MessageModel.create(msgData);
  }

  async createNewRoom(roomData) {
    const newRoom = await this.RoomModel.create(roomData);
    return await newRoom.save();
  }
}