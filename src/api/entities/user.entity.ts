export type UserRole = "user" | "admin";

export class User {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly password: string,
    public readonly profilePic: string,
    public readonly role: UserRole,
    public readonly lastSeen: Date | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  toSafeJSON() {
    return {
      id: this.id,
      email: this.email,
      fullName: this.fullName,
      profilePic: this.profilePic,
      role: this.role,
      lastSeen: this.lastSeen,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
