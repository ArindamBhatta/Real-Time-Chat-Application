export class Group {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly description: string,
    public readonly avatar: string,
    public readonly adminId: string,
    public readonly memberIds: string[],
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}
}
