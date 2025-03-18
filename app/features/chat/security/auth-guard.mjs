@injectable()
export default class AuthGuard {
   constructor(private userService) { }

   public async canAccessRoom(roomId: string): Promise {
      const currentUser = await userService.getCurrentUser();
      const targetRm = await Room.findOne({ _id: ObjectId(roomId) });

      return targetRm.owner === currentUser.id ||
         targetRm.members.includes(currentUser.id);
   }
}