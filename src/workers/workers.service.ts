import { Injectable, UnauthorizedException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { EventsService } from '../events/events.service';
import { GuestsService } from '../guests/guests.service';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Worker, WorkerDocument } from '../schemas/worker.schema';
import { RegisterDto } from '../auth/dto/register.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class WorkersService {
  constructor(
    private readonly eventsService: EventsService,
    private readonly guestsService: GuestsService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    @InjectModel(Worker.name) private workerModel: Model<WorkerDocument>,
  ) {}

  // Worker Registration System
  async registerWorker(registerData: RegisterDto) {
    // Validate required fields for worker registration
    if (!registerData.state || !registerData.branch) {
      throw new BadRequestException('State and Branch are required for worker registration');
    }

    // Set role to WORKER and ensure not approved initially
    const workerData = {
      ...registerData,
      role: Role.WORKER,
    };

    // Use auth service to register the worker
    const newWorker = await this.authService.register(workerData);

    return {
      message: 'Worker registration submitted successfully. Awaiting Branch Admin approval.',
      user: newWorker
    };
  }

  async getWorkerProfile(workerId: string) {
    const user = await this.usersService.findById(workerId);
    if (!user || user.role !== Role.WORKER) {
      throw new NotFoundException('Worker not found');
    }    // Get worker performance data
    const performance = await this.getWorkerEventPerformance(workerId, '');
    
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      state: user.state,
      branch: user.branch,
      isApproved: user.isApproved,
      approvedBy: user.approvedBy,
      performanceRating: user.performanceRating,
      isActive: user.isActive,
      performance
    };
  }
  async updateWorkerProfile(workerId: string, updateData: any) {
    const user = await this.usersService.findById(workerId);
    if (!user || user.role !== Role.WORKER) {
      throw new NotFoundException('Worker not found');
    }

    // Only allow updating certain fields
    const allowedFields = ['name', 'phone'];
    const filteredData = {};
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    }

    return this.usersService.update(workerId, filteredData, user);
  }

  // Branch Admin Methods
  async getPendingWorkers(branchAdminId: string) {
    return this.usersService.getPendingWorkers(branchAdminId);
  }

  async approveWorker(workerId: string, branchAdminId: string) {
    const result = await this.usersService.approveWorker(workerId, branchAdminId);
    
    // Create worker profile
    await this.createWorkerProfile(workerId);
    
    return {
      message: 'Worker approved successfully',
      worker: result
    };
  }

  async rejectWorker(workerId: string, branchAdminId: string) {
    const branchAdmin = await this.usersService.findById(branchAdminId);
    if (!branchAdmin || branchAdmin.role !== Role.BRANCH_ADMIN) {
      throw new ForbiddenException('Only branch admins can reject workers');
    }

    const worker = await this.usersService.findById(workerId);
    if (!worker || worker.role !== Role.WORKER) {
      throw new NotFoundException('Worker not found');
    }

    if (worker.branch?.toString() !== branchAdmin.branch?.toString()) {
      throw new ForbiddenException('Can only reject workers in your branch');
    }    // Delete the worker registration
    await this.usersService.delete(workerId, { role: Role.BRANCH_ADMIN });
    
    return {
      message: 'Worker registration rejected and removed'
    };
  }

  async createWorkerProfile(workerId: string) {
    const existingWorker = await this.workerModel.findOne({ user: workerId }).exec();
    if (existingWorker) {
      return existingWorker;
    }

    const newWorker = new this.workerModel({
      user: workerId,
      totalGuestsRegistered: 0,
      guestsPerEvent: new Map(),
      lastActivityDate: new Date()
    });

    return newWorker.save();
  }

  // Enhanced Event Viewing for Workers
  async getAvailableEvents(workerId: string) {
    const worker = await this.usersService.findById(workerId);
    if (!worker || worker.role !== Role.WORKER) {
      throw new ForbiddenException('Only approved workers can view events');
    }

    if (!worker.isApproved) {
      throw new ForbiddenException('Worker must be approved to view events');
    }

    // Get events that are available in worker's branch and are finalized
    const events = await this.eventsService.getEventsForWorkerBranch(worker.branch.toString());
    return events.filter(event => event.status === 'published' || event.status === 'in_progress');
  }

  async volunteerForEvent(eventId: string, workerId: string) {
    return this.eventsService.addWorkerToEvent(eventId, workerId);
  }

  async leaveEvent(eventId: string, workerId: string) {
    return this.eventsService.removeWorkerFromEvent(eventId, workerId);
  }

  async getWorkerEvents(workerId: string) {
    const user = await this.usersService.findById(workerId);
    
    // If the user has no events, return empty array
    if (!user.eventParticipation || user.eventParticipation.length === 0) {
      return [];
    }
    
    // Get all events the user has participated in using their eventParticipation array
    const eventIds = user.eventParticipation.map(id => id.toString());
    
    // Find all these events and return them
    const events = await this.eventsService.findAll();
    return events.filter(event => eventIds.includes(event._id.toString()));
  }

  async registerGuest(workerId: string, eventId: string, guestData: any) {
    // Verify worker is assigned to this event
    const event = await this.eventsService.findOne(eventId);
    const workerId_ObjId = new Types.ObjectId(workerId);
    
    // Extract just the ID from each worker object
    const workerIds = event.workers.map((w: any) => {
      // If w is already an ObjectId, use toString()
      if (w instanceof Types.ObjectId) {
        return w.toString();      }
      
      // If w is a full user object (as returned by populate), extract the _id
      if (w && typeof w === 'object' && '_id' in w) {
        return w._id.toString();
      }
      
      // If w is something else, convert to string (fallback)
      return String(w);
    });
    
    // Check if the worker exists in the event's workers array
    const isWorkerAuthorized = workerIds.includes(workerId);
    
    if (!isWorkerAuthorized) {
      throw new UnauthorizedException('You are not authorized to register guests for this event');
    }

    // If bus pickup is selected, validate the pickup station exists
    if (guestData.transportPreference === 'bus' && guestData.pickupStation) {
      // Verify the pickup station exists in the event
      const validStation = event.pickupStations.some(
        station => station.pickupStationId.toString() === guestData.pickupStation.toString()
      );
      if (!validStation) {
        throw new NotFoundException('Invalid pickup station for this event');
      }
    }

    // Create guest with worker reference
    return this.guestsService.create({
      ...guestData,
      event: eventId,
      registeredBy: workerId,
    });
  }

  // Phase 2.3: Quick Guest Registration (30-second target)
  async quickRegisterGuest(workerId: string, eventId: string, quickGuestData: any) {
    const worker = await this.usersService.findById(workerId);
    if (!worker || worker.role !== Role.WORKER) {
      throw new ForbiddenException('Only approved workers can register guests');
    }

    if (!worker.isApproved) {
      throw new ForbiddenException('Worker must be approved to register guests');
    }

    const event = await this.eventsService.findOne(eventId);
    const workerIds = event.workers.map(w => w.toString());
    const isWorkerAuthorized = workerIds.includes(workerId);
    
    if (!isWorkerAuthorized) {
      throw new UnauthorizedException('You are not authorized to register guests for this event');
    }

    // Pre-fill worker's state and branch data for quick registration
    const fullGuestData = {
      ...quickGuestData,
      event: eventId,
      registeredBy: workerId,
      state: worker.state,  // Auto-fill from worker's profile
      branch: worker.branch, // Auto-fill from worker's profile
    };

    // Quick validation for bus pickup
    if (quickGuestData.transportPreference === 'bus' && quickGuestData.pickupStation) {
      const validStation = event.pickupStations.some(
        station => station.pickupStationId.toString() === quickGuestData.pickupStation.toString()
      );
      if (!validStation) {
        throw new NotFoundException('Invalid pickup station for this event');
      }
    }

    return this.guestsService.create(fullGuestData);
  }
  async updateGuest(workerId: string, guestId: string, updateData: any) {
    const guest = await this.guestsService.findOne(guestId);

    // Verify worker registered this guest
    if (guest.registeredBy.toString() !== workerId) {
      throw new UnauthorizedException('You can only edit guests you registered');
    }

    // PRD Requirement: Check if event day has passed - no edits allowed on/after event day
    const event = await this.eventsService.findOne(guest.event.toString());
    const eventDate = new Date(event.date);
    const today = new Date();
    
    // Set time to start of day for accurate comparison
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (today >= eventDate) {
      throw new ForbiddenException('Cannot edit guest details on or after the event day');
    }

    // If updating bus pickup, validate the new pickup station
    if (updateData.transportPreference === 'bus' && updateData.pickupStation) {
      // Verify the pickup station exists in the event
      const validStation = event.pickupStations.some(
        station => station.pickupStationId.toString() === updateData.pickupStation.toString()
      );
      if (!validStation) {
        throw new NotFoundException('Invalid pickup station for this event');
      }
    }

    return this.guestsService.update(guestId, updateData);
  }  async removeGuest(workerId: string, guestId: string) {
    const guest = await this.guestsService.findOne(guestId);

    // Verify worker registered this guest
    if (guest.registeredBy.toString() !== workerId) {
      throw new UnauthorizedException('You can only remove guests you registered');
    }

    // PRD Requirement: Check if event day has passed - no deletions allowed on/after event day
    const event = await this.eventsService.findOne(guest.event.toString());
    const eventDate = new Date(event.date);
    const today = new Date();
    
    // Set time to start of day for accurate comparison
    eventDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    if (today >= eventDate) {
      throw new ForbiddenException('Cannot delete guest details on or after the event day');
    }

    return this.guestsService.remove(guestId);
  }

  async getWorkerGuests(workerId: string, eventId?: string) {
    const query = { registeredBy: workerId };
    if (eventId) {
      query['event'] = eventId;
    }
    return this.guestsService.findByQuery(query);
  }

  // Phase 2.4: Enhanced Worker's Guest Management
  async getWorkerGuestsWithFilters(workerId: string, filters: {
    eventId?: string;
    transportPreference?: 'bus' | 'private';
    checkedIn?: boolean;
    search?: string;
    sortBy?: 'name' | 'registeredAt' | 'checkedInTime';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const query: any = { registeredBy: workerId };
    
    if (filters.eventId) query.event = filters.eventId;
    if (filters.transportPreference) query.transportPreference = filters.transportPreference;
    if (filters.checkedIn !== undefined) query.checkedIn = filters.checkedIn;
    
    // Search functionality
    if (filters.search) {
      const searchRegex = new RegExp(filters.search, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    const guests = await this.guestsService.findByQuery(query);
    
    // Sort results
    if (filters.sortBy) {
      const sortField = filters.sortBy === 'registeredAt' ? 'createdAt' : filters.sortBy;
      const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
      guests.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder * aVal.localeCompare(bVal);
        }
        if (aVal instanceof Date && bVal instanceof Date) {
          return sortOrder * (aVal.getTime() - bVal.getTime());
        }
        return 0;
      });
    }

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      guests: guests.slice(startIndex, endIndex),
      pagination: {
        total: guests.length,
        page,
        limit,
        totalPages: Math.ceil(guests.length / limit),
        hasNextPage: endIndex < guests.length,
        hasPrevPage: page > 1
      },
      summary: {
        totalGuests: guests.length,
        checkedIn: guests.filter(g => g.checkedIn).length,
        busPreference: guests.filter(g => g.transportPreference === 'bus').length,
        privatePreference: guests.filter(g => g.transportPreference === 'private').length
      }
    };
  }

  async bulkUpdateGuests(workerId: string, guestIds: string[], updateData: any) {
    // Verify all guests belong to this worker
    const guests = await Promise.all(
      guestIds.map(id => this.guestsService.findOne(id))
    );
    
    const unauthorizedGuests = guests.filter(
      guest => guest.registeredBy.toString() !== workerId
    );
    
    if (unauthorizedGuests.length > 0) {
      throw new UnauthorizedException('You can only update guests you registered');
    }

    // Perform bulk update
    const updatePromises = guestIds.map(id => 
      this.guestsService.update(id, updateData)
    );
    
    const updatedGuests = await Promise.all(updatePromises);
    
    return {
      message: `Successfully updated ${updatedGuests.length} guests`,
      updatedCount: updatedGuests.length,
      guests: updatedGuests
    };
  }

  async getGuestRegistrationStats(workerId: string, eventId?: string) {
    const query: any = { registeredBy: workerId };
    if (eventId) query.event = eventId;
    
    const guests = await this.guestsService.findByQuery(query);
      // Group by registration date
    const registrationsByDate = guests.reduce((acc, guest) => {
      const date = new Date((guest as any).createdAt).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});
    
    // Group by event
    const guestsByEvent = guests.reduce((acc, guest) => {
      const eventId = guest.event.toString();
      if (!acc[eventId]) {
        acc[eventId] = { count: 0, checkedIn: 0 };
      }
      acc[eventId].count++;
      if (guest.checkedIn) {
        acc[eventId].checkedIn++;
      }
      return acc;
    }, {});
    
    return {
      totalGuests: guests.length,
      checkedInGuests: guests.filter(g => g.checkedIn).length,
      checkInRate: guests.length ? (guests.filter(g => g.checkedIn).length / guests.length * 100).toFixed(2) + '%' : '0%',
      transportBreakdown: {
        bus: guests.filter(g => g.transportPreference === 'bus').length,
        private: guests.filter(g => g.transportPreference === 'private').length
      },
      registrationsByDate,
      guestsByEvent,      recentRegistrations: guests
        .sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime())
        .slice(0, 5)
        .map(g => ({
          id: g._id,
          name: g.name,
          phone: g.phone,
          registeredAt: (g as any).createdAt
        }))
    };
  }

  async getWorkerEventPerformance(workerId: string, eventId: string) {
    const guests = await this.guestsService.findByQuery({
      registeredBy: workerId,
      event: eventId
    });
    
    const event = await this.eventsService.findOne(eventId);
    
    return {
      event: {
        id: event._id,
        name: event.name,
        date: event.date
      },
      guestsCount: guests.length,
      guests: guests.map(guest => ({
        id: guest._id,
        name: guest.name,
        email: guest.email,
        phone: guest.phone,
        transportPreference: guest.transportPreference,
        checkedIn: guest.checkedIn || false,
        checkedInTime: guest.checkedInTime,
        checkedInBy: guest.checkedInBy
      }))
    };
  }

  async getWorkerPerformanceStats(workerId: string) {
    const workers = await this.usersService.findByRole(Role.WORKER);
    const workerIndex = workers.findIndex(w => w._id.toString() === workerId);
    const worker = workers[workerIndex];
    
    if (!worker) {
      throw new NotFoundException('Worker not found');
    }

    // Get total guests registered by this worker
    const totalGuests = await this.guestsService.findByQuery({ registeredBy: workerId });
    
    // Get worker's events
    const workerEvents = await this.getWorkerEvents(workerId);
    
    // Calculate performance metrics
    const totalGuestsCount = totalGuests.length;
    const checkedInGuests = totalGuests.filter(g => g.checkedIn).length;
    const checkInRate = totalGuestsCount ? (checkedInGuests / totalGuestsCount * 100) : 0;
    
    // Calculate ranking among all workers
    const workerStats = await Promise.all(
      workers.map(async (w) => {
        const guestCount = (await this.guestsService.findByQuery({ registeredBy: w._id.toString() })).length;
        return { workerId: w._id.toString(), guestCount };
      })
    );
    
    workerStats.sort((a, b) => b.guestCount - a.guestCount);
    const ranking = workerStats.findIndex(s => s.workerId === workerId) + 1;
    
    return {
      totalGuests: totalGuestsCount,
      checkedInGuests,
      checkInRate: `${checkInRate.toFixed(2)}%`,
      totalEvents: workerEvents.length,
      ranking,
      totalWorkers: workers.length,
      transportPreferences: {
        bus: totalGuests.filter(g => g.transportPreference === 'bus').length,
        private: totalGuests.filter(g => g.transportPreference === 'private').length
      }
    };
  }

  async getTopPerformingWorkers(limit: number = 10) {
    const workers = await this.usersService.findByRole(Role.WORKER);
    
    const workerStats = await Promise.all(
      workers.map(async (worker) => {
        const guests = await this.guestsService.findByQuery({ registeredBy: worker._id.toString() });
        const checkedInGuests = guests.filter(g => g.checkedIn).length;
        const checkInRate = guests.length ? (checkedInGuests / guests.length * 100) : 0;
        
        return {
          id: worker._id,
          name: worker.name,
          email: worker.email,
          branch: worker.branch,
          totalGuests: guests.length,
          checkedInGuests,
          checkInRate: parseFloat(checkInRate.toFixed(2))
        };
      })
    );
    
    // Sort by total guests and then by check-in rate
    workerStats.sort((a, b) => {
      if (b.totalGuests !== a.totalGuests) {
        return b.totalGuests - a.totalGuests;
      }
      return b.checkInRate - a.checkInRate;
    });
    
    return workerStats.slice(0, limit);
  }
}
