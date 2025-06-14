import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../../schemas/user.schema';
import { Guest, GuestDocument } from '../../schemas/guest.schema';
import { Role } from '../../common/enums/role.enum';
import { AdminHierarchyCoreService } from './admin-hierarchy-core.service';

/**
 * Service for calculating performance metrics and analytics
 */
@Injectable()
export class PerformanceAnalyticsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Guest.name) private guestModel: Model<GuestDocument>,
    private adminHierarchyCoreService: AdminHierarchyCoreService,
  ) {}

  /**
   * Calculate performance rating for a marketer
   */
  async calculateMarketerPerformanceRating(
    marketerId: string,
  ): Promise<{ rating: number; metrics: any }> {
    const marketer = await this.userModel.findById(marketerId).exec();
    if (!marketer || marketer.role !== Role.WORKER) {
      throw new Error('Marketer not found or invalid role');
    }

    // Get marketer's performance metrics
    const totalGuests = await this.guestModel
      .countDocuments({ invitedBy: marketerId })
      .exec();

    const confirmedGuests = await this.guestModel
      .countDocuments({ invitedBy: marketerId, status: 'confirmed' })
      .exec();

    const attendedGuests = await this.guestModel
      .countDocuments({ invitedBy: marketerId, status: 'attended' })
      .exec();

    // Calculate rates
    const confirmationRate = totalGuests > 0 ? (confirmedGuests / totalGuests) * 100 : 0;
    const attendanceRate = confirmedGuests > 0 ? (attendedGuests / confirmedGuests) * 100 : 0;

    // Calculate overall rating (simple formula - can be enhanced)
    let rating = 0;
    if (totalGuests >= 50) rating += 2;
    else if (totalGuests >= 20) rating += 1;

    if (confirmationRate >= 80) rating += 2;
    else if (confirmationRate >= 60) rating += 1;

    if (attendanceRate >= 80) rating += 2;
    else if (attendanceRate >= 60) rating += 1;

    // Ensure rating is between 1-5
    rating = Math.max(1, Math.min(5, rating));

    const metrics = {
      totalGuests,
      confirmedGuests,
      attendedGuests,
      confirmationRate: parseFloat(confirmationRate.toFixed(2)),
      attendanceRate: parseFloat(attendanceRate.toFixed(2)),
      rating,
      ratingText: this.getRatingText(rating),
    };

    return { rating, metrics };
  }

  /**
   * Get marketers performance summary for an admin's jurisdiction
   */
  async getMarketersPerformanceSummary(adminId: string): Promise<any[]> {
    const admin = await this.adminHierarchyCoreService.getAdminWithHierarchy(adminId);
    let query: any = { role: Role.WORKER, isActive: true };

    // Filter marketers based on admin's jurisdiction
    switch (admin.role) {
      case Role.SUPER_ADMIN:
        // Can see all marketers
        break;
      case Role.STATE_ADMIN:
        query.state = admin.state;
        break;
      case Role.BRANCH_ADMIN:
        query.branch = admin.branch;
        break;
      case Role.ZONAL_ADMIN:
        query.zone = admin.zone;
        break;
      default:
        throw new ForbiddenException('Insufficient permissions');
    }

    const marketers = await this.userModel
      .find(query)
      .populate('state', 'name')
      .populate('branch', 'name location')
      .populate('zone', 'name')
      .select(
        'name email phone state branch zone lastLogin createdAt',
      )
      .sort({ createdAt: -1 })
      .exec();

    // Calculate performance for each marketer
    const performanceSummary = await Promise.all(
      marketers.map(async (marketer) => {
        const { rating, metrics } = await this.calculateMarketerPerformanceRating(
          marketer._id.toString(),
        );

        return {
          id: marketer._id.toString(),
          name: marketer.name,          email: marketer.email,
          phone: marketer.phone,
          performance: metrics,
          lastLogin: marketer.lastLogin,
          joinedDate: (marketer as any).createdAt,
          location: {
            state: marketer.state,
            branch: marketer.branch,
            zone: marketer.zone,
          },
        };
      }),
    );

    return performanceSummary;
  }

  /**
   * Convert numeric rating to text
   */
  private getRatingText(rating: number): string {
    switch (Math.round(rating)) {
      case 5:
        return 'Excellent';
      case 4:
        return 'Good';
      case 3:
        return 'Average';
      case 2:
        return 'Below Average';
      case 1:
        return 'Poor';
      default:
        return 'Not Rated';
    }
  }
}
