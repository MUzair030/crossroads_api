import {UserType} from "../UserType.js";

function mapToDomain(data) {
    const domainData = {};

    if (data.googleId) domainData.googleId = data.googleId;
    if (data.name) domainData.name = data.name;
    if (data.firstName) domainData.firstName = data.firstName;
    if (data.lastName) domainData.lastName = data.lastName;
    if (data.email) domainData.email = data.email;
    if (data.phone) domainData.phone = data.phone;
    if (data.dob) domainData.dob = new Date(data.dob); // Ensure it's a Date
    if (data.city) domainData.city = data.city;
    if (data.state) domainData.state = data.state;
    if (data.country) domainData.country = data.country;
    if (data.password) domainData.password = data.password;
    if (data.profilePicture) domainData.profilePicture = data.profilePicture;
    if (data.isVerified !== undefined) domainData.isVerified = Boolean(data.isVerified);
    if (data.isProfileSetup !== undefined) domainData.isProfileSetup = Boolean(data.isProfileSetup);
    if (data.userType) domainData.userType = data.userType;
    if (data.identificationNumber) domainData.identificationNumber = data.identificationNumber;
    if (data.identificationRecord) domainData.identificationRecord = data.identificationRecord;
    if (data.isCompany !== undefined) domainData.isCompany = Boolean(data.isCompany);
    if (data.companyName) domainData.companyName = data.companyName;
    if (data.companyRegistrationNumber) domainData.companyRegistrationNumber = data.companyRegistrationNumber;
    if (data.verificationToken) domainData.verificationToken = data.verificationToken;
    if (data.resetOtpExpiry) domainData.resetOtpExpiry = new Date(data.resetOtpExpiry);
    if (data.isDeleted !== undefined) domainData.isDeleted = Boolean(data.isDeleted);

    return domainData;
}

export function mapToDomainUpdateReq(data) {
    const domain = {};

    if (data.googleId) domain.googleId = data.googleId;
    if (data.name) domain.name = data.name;
    if (data.firstName) domain.firstName = data.firstName;
    if (data.lastName) domain.lastName = data.lastName;
    if (data.email) domain.email = data.email;
    if (data.phone) domain.phone = data.phone;
    if (data.dob) domain.dob = new Date(data.dob);
    if (data.city) domain.city = data.city;
    if (data.state) domain.state = data.state;
    if (data.country) domain.country = data.country;
    if (data.identificationNumber) domain.identificationNumber = data.identificationNumber;
    if (data.identificationRecord) domain.identificationRecord = data.identificationRecord;
    if (data.companyName) domain.companyName = data.companyName;
    if (data.companyRegistrationNumber) domain.companyRegistrationNumber = data.companyRegistrationNumber;
    if (data.userType) domain.userType = UserType[data.userType];
    if (domain.userType) domain.isProfileSetup = true;
    if (domain.userType === UserType.COMPANY_ACCOUNT) domain.isCompany = true;
    return domain;
}


export function mapToDto(data) {
    const dto = {};
    dto.id = data?._id.toString();
    if (data.googleId) dto.googleId = data.googleId;
    if (data.name) dto.name = data.name;
    if (data.firstName) dto.firstName = data.firstName;
    if (data.lastName) dto.lastName = data.lastName;
    if (data.email) dto.email = data.email;
    if (data.phone) dto.phone = data.phone;
    if (data.dob) dto.dob = new Date(data.dob);
    if (data.city) dto.city = data.city;
    if (data.state) dto.state = data.state;
    if (data.country) dto.country = data.country;
    if (data.profilePicture) dto.profilePicture = data.profilePicture;
    if (data.isVerified !== undefined) dto.isVerified = Boolean(data.isVerified);
    if (data.isProfileSetup !== undefined) dto.isProfileSetup = Boolean(data.isProfileSetup);
    if (data.userType) dto.userType = data.userType;
    if (data.identificationNumber) dto.identificationNumber = data.identificationNumber;
    if (data.identificationRecord) dto.identificationRecord = data.identificationRecord;
    if (data.isCompany !== undefined) dto.isCompany = Boolean(data.isCompany);
    if (data.companyName) dto.companyName = data.companyName;
    if (data.companyRegistrationNumber) dto.companyRegistrationNumber = data.companyRegistrationNumber;
    if (data.verificationToken) dto.otp = data.verificationToken;
    if (data.isDeleted !== undefined) dto.isDeleted = data.isDeleted;

    return dto;
}

