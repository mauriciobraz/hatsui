export class UserNotFound extends Error {
  constructor() {
    super(`User not found`);
  }
}
export class CannotSendDM extends Error {
  constructor() {
    super("Cannot send DM.");
  }
}
