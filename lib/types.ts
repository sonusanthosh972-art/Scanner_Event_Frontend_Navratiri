export interface User {
  appUserId: number;
  appUserName: string;
  appPassword: string;
  eventId: number;
}

export interface ApiMessage {
  value: boolean;
  message: string;
}

export interface InOutEntry {
  eventLogId: number;
  logDate: string;
  qrId: number | null;
  qrName: string | null;
  inFlag: string | null;
  passValidity: string | null;
}

export interface GuestDetails {
  registrationId: number;
  fullName: string | null;
  gender: string | null;
  email: string | null;
  mobileNumber: string | null;
  dateOfBirth: string | null;
  emergencyContactNo: string | null;
  ticketCategory: string | null;
  amount: string | null;
  city: string | null;
  tShirtSize: string | null;
  referedBy: string | null;
  orderId: string | null;
  paymentId: string | null;
  eventid: string | null;
  paymentStatus: string | null;
  listevent: unknown | null;
  banner: string | null;
  bannerPhoto: string | null;
  eventDate: string | null;
  eventAmountId: number | null;
  raceCategory: string | null;
  eAmount: string | null;
  discountRate: string | null;
  date: string | null;
  listAmount: unknown | null;
  qrId: number | null;
  qrCode: string | null;
  qrName: string | null;
  qrValue: string | null;
  organization: string | null;
  eventLogId: number | null;
  deviceIp: string | null;
  mobileName: string | null;
  logDate: string | null;
  entryDate: string | null;
  inFlag: string | null;
}

export interface Employee {
  employeeId: number;
  parentCompanyId: number;
  branchId: number;
  companyId: number;
  userId: number;
  eventid: string;
  parentCompanyName: string | null;
  branchName: string | null;
  companyName: string | null;
  firstName: string;
  inFlag: string;
  registrationId: number;
  childRegistrationId: number;
  lastName: string;
  employeeCardNo: string | null;
  employeeDeviceCode: string | null;
  employeeName: string;
  employeeGuardian: string | null;
  relation: string | null;

  dateOfBirth: string | null;
  currentAddress: string | null;
  permanentAddress: string | null;

  mobileNo: string | null;
  phoneNoHome: string | null;
  email: string | null;

  bloodGroup: string | null;
  gender: string | null;
  nationality: string | null;
  religion: string | null;
  maritalStatus: string | null;
  qualification: string | null;

  dateOfJoining: string | null;
  adharCardNo: string | null;
  panCardNo: string | null;
  uanNo: string | null;
  pfNo: string | null;
  pfAccountNo: string | null;
  pfJoinDate: string | null;
  restrictedPF: string | null;
  zeroPension: string | null;

  esicNo: string | null;
  esicApplicable: string | null;
  ptApplicable: string | null;

  bankName: string | null;
  bankBranch: string | null;
  bankAccountNo: string | null;
  ifscCode: string | null;

  dateOfResign: string | null;
  resignReason: string | null;
  password: string | null;

  departmentId: number | null;
  designationId: number | null;
  shiftGroupId: number | null;
  shiftId: number | null;

  departmentName: string | null;
  designationName: string | null;
  shiftGroupName: string | null;
  shiftName: string | null;
  weekOffDay: string | null;

  employeeType: string | null;
  payType: string | null;
  remarks: string | null;

  entryDate: string | null;
  entryBy: number | null;
  updateDate: string | null;
  updateBy: number | null;

  isActive: boolean | number | null;   // API may send 0/1 or null
  userType: string | null;
  isApproved: boolean | number | null;

  qrCode: string | null;

  listDesignation: unknown[] | null;
  listShiftGroup: unknown[] | null;
  listShift: unknown[] | null;
  listEmployee: unknown[] | null;
  listBranch: unknown[] | null;

  deviceLogId: number;
  deviceIp: string | null;
  logDate: string | null;
  processStatus: string | null;
  portNo: string | null;
  inOutFlag: string | null;
  attendanceDate: string | null;

  childFirstName: string;
  childLastName: string;
  childEmail: string;
  childMobileNumber: string | null;
  childMealPreference: string | null;
  childQrCode: string | null;
  organization: string;
  qrId: string | null;
  qrName: string | null;
}