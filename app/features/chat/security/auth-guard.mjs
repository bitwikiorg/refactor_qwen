@injectable()
export default class AuthGuard {
   constructor(userService) {
      this.userService = userService;
   }

   async canAccessRoom(roomId) {
      const currentUser = await this.userService.getCurrentUser();
      const targetRm = await Room.findOne({ _id: ObjectId(roomId) });

      return targetRm.owner === currentUser.id ||
         targetRm.members.includes(currentUser.id);
   }
}