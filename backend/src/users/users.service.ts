import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  findByGoogleId(googleId: string): Promise<User | null> {
    return this.users.findOne({ where: { googleId } });
  }

  findByEmployeeCode(employeeCode: string): Promise<User | null> {
    const code = employeeCode.trim();
    if (!code) return Promise.resolve(null);
    return this.users.findOne({ where: { employeeCode: code } });
  }

  findByGoogleIdOrEmail(googleId: string, email: string): Promise<User | null> {
    return this.users.findOne({
      where: [{ googleId }, { email }],
    });
  }

  async create(data: Partial<User>): Promise<User> {
    const entity = this.users.create(data);
    return this.users.save(entity);
  }

  async save(user: User): Promise<User> {
    return this.users.save(user);
  }
}
