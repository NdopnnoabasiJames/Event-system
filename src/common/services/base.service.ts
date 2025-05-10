import { Model, Document } from 'mongoose';
import { Logger } from '@nestjs/common';
import { PaginationParams, PaginatedResponse } from '../interfaces/pagination.interface';

export class BaseService<T extends Document> {
  protected readonly logger: Logger;

  constructor(
    protected readonly model: Model<T>,
    serviceName: string,
  ) {
    this.logger = new Logger(serviceName);
  }

  async create(createDto: any): Promise<T> {
    const created = new this.model(createDto);
    return created.save();
  }

  async findAll(params: PaginationParams): Promise<PaginatedResponse<T>> {
    const { page = 1, limit = 10, sort = '_id', order = 'desc' } = params;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.model
        .find()
        .sort({ [sort]: order })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.model.countDocuments(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<T> {
    return this.model.findById(id).exec();
  }

  async update(id: string, updateDto: any): Promise<T> {
    return this.model
      .findByIdAndUpdate(id, { $set: updateDto }, { new: true })
      .exec();
  }

  async remove(id: string): Promise<T> {
    return this.model.findByIdAndDelete(id).exec();
  }

  async exists(filter: object): Promise<boolean> {
    const count = await this.model.countDocuments(filter);
    return count > 0;
  }
}
