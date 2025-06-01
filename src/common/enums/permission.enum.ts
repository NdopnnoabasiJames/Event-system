export enum Permission {
  // Event permissions
  CREATE_EVENT = 'create_event',
  READ_EVENT = 'read_event',
  UPDATE_EVENT = 'update_event',
  DELETE_EVENT = 'delete_event',
  EXPORT_EVENT = 'export_event',

  // Admin management permissions
  CREATE_ADMIN = 'create_admin',
  READ_ADMIN = 'read_admin',
  UPDATE_ADMIN = 'update_admin',
  DELETE_ADMIN = 'delete_admin',
  APPROVE_ADMIN = 'approve_admin',
  DISABLE_ADMIN = 'disable_admin',
  REPLACE_ADMIN = 'replace_admin',
  EXPORT_ADMIN = 'export_admin',

  // Hierarchy management permissions
  READ_STATE = 'read_state',
  UPDATE_STATE = 'update_state',
  EXPORT_STATE = 'export_state',

  READ_BRANCH = 'read_branch',
  UPDATE_BRANCH = 'update_branch',
  EXPORT_BRANCH = 'export_branch',

  READ_ZONE = 'read_zone',
  UPDATE_ZONE = 'update_zone',
  EXPORT_ZONE = 'export_zone',

  // Pickup station permissions
  CREATE_PICKUP_STATION = 'create_pickup_station',
  READ_PICKUP_STATION = 'read_pickup_station',
  UPDATE_PICKUP_STATION = 'update_pickup_station',
  DELETE_PICKUP_STATION = 'delete_pickup_station',
  EXPORT_PICKUP_STATION = 'export_pickup_station',

  // System permissions
  VIEW_AUDIT_TRAIL = 'view_audit_trail',
  MANAGE_SYSTEM = 'manage_system',
}
