import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { Admin } from "../models/admin.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import {v2 as cloudinary} from "cloudinary"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import { AccidentData } from "../models/accidentData.model.js";


const generateAccessAndRefereshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for photo
    // upload them to cloudinary, photo
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {role, fullName, vehicleType, vehicleModel, vehicleNumber, licenseNumber, age, gender, serviceProvider, email, phoneNumber, password } = req.body
    //console.log("email: ", email);

    if (
        [role, fullName, email, vehicleType, vehicleModel, vehicleNumber, licenseNumber, phoneNumber, gender, password].some((field) => field?.trim() === "") || !age || !serviceProvider
    ) {
        console.log(role, fullName, email, vehicleType, vehicleModel, vehicleNumber, licenseNumber, age, gender, serviceProvider, phoneNumber, password)
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ phoneNumber }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    //console.log(req.files);
    const existedServiceProvider = await Admin.findOne({ companyName: serviceProvider });
    if(!existedServiceProvider){
        throw new ApiError(404, "Service Provider not found")
    }

    const photoLocalPath = req.files?.photo[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;    

    if (!photoLocalPath) {
        throw new ApiError(400, "Profile photo file is required")
    }

    console.log(photoLocalPath);
    const photo = await uploadOnCloudinary(photoLocalPath)

    if (!photo) {
        throw new ApiError(400, "Profile photo file is required")
    }

    const user = await User.create({
        role: role.toLowerCase(),
        fullName, 
        vehicleType: vehicleType.toLowerCase(), 
        vehicleModel, 
        vehicleNumber, 
        licenseNumber, 
        age, 
        gender, 
        serviceProvider: existedServiceProvider._id,
        email, 
        phoneNumber, 
        photo: photo.url,
        password
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )

const loginUser = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, phoneNumber, password} = req.body
    console.log(email);

    if (!phoneNumber && !email) {
        throw new ApiError(400, "phone number or email is required")
    }

    const user = await User.findOne({
        $or: [{phoneNumber}, {email}]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist")
    }

   const isPasswordValid = await user.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60 * 1000
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully"
        )
    )

})

const logoutUser = asyncHandler(async(req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1 // this removes the field from document
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentUser = asyncHandler(async(req, res) => {    
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, vehicleType, vehicleModel, vehicleNumber, licenseNumber, age, gender, serviceProvider, email, phoneNumber} = req.body

    if (!fullName || !email || !vehicleType || !vehicleModel || !vehicleNumber || !licenseNumber || !age || !gender || !serviceProvider || !phoneNumber) {
        throw new ApiError(400, "At least one field is required to change")
    }

    let existedServiceProvider;
    if(serviceProvider) {
        existedServiceProvider = await Admin.findById(serviceProvider);
        if(!existedServiceProvider){
            throw new ApiError(404, "Service Provider not found")
        }
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email,
                vehicleType: vehicleType,
                vehicleModel: vehicleModel,
                vehicleNumber: vehicleNumber,
                licenseNumber: licenseNumber,
                age: age,
                gender: gender,
                serviceProvider: existedServiceProvider._id,
                phoneNumber: phoneNumber
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserPhoto = asyncHandler(async(req, res) => {
    const photoLocalPath = req.file?.path
    console.log(photoLocalPath);

    if (!photoLocalPath) {
        throw new ApiError(400, "Profile photo file is missing")
    }

    const photo = await uploadOnCloudinary(photoLocalPath)

    if (!photo.url) {
        throw new ApiError(400, "Error while uploading photo")
        
    }

    const imageURL = req.user?.photo
    const getPublicId = (imageURL) => imageURL.split("/").pop().split(".")[0]
    const publicId = getPublicId(imageURL)
    const deleted = await cloudinary.uploader.destroy(publicId)

    if(deleted.result !== "ok"){
        throw new ApiError(400, "Error while deleting old photo")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                photo: photo.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const uploadAccidentData = asyncHandler(async(req, res) => {
    const {location, speed, isDrowsy, isOversped} = req.body
    const user = req.user

    const accidentData = await AccidentData.create({
        location,
        speed,
        isDrowsy,
        isOversped,
        victim: user._id
    })

    return res
    .status(201)
    .json(new ApiResponse(201, accidentData, "Accident data uploaded successfully"))    
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserPhoto,
    uploadAccidentData
}