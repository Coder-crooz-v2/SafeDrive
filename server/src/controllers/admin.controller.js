import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { Admin } from "../models/admin.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";
import { AccidentData } from "../models/accidentData.model.js";


const generateAccessAndRefereshTokens = async(adminId) =>{
    try {
        const admin = await Admin.findById(adminId)
        const accessToken = admin.generateAccessToken()
        const refreshToken = admin.generateRefreshToken()

        admin.refreshToken = refreshToken
        await admin.save({ validateBeforeSave: false })

        return {accessToken, refreshToken}


    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating referesh and access token")
    }
}

const registerAdmin = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for photo
    // upload them to cloudinary, photo
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {role, companyName, email, phoneNumber, password } = req.body
    //console.log("email: ", email);
    console.log(req);
    console.log(role, companyName, email, phoneNumber, password);
    if (
        !role || !companyName || !email || !phoneNumber || !password
    ) {
        throw new ApiError(400, "All fields are required")
    }

    console.log(role, companyName, email, phoneNumber, password);

    const existedAdmin = await Admin.findOne({
        $or: [{ phoneNumber }, { email }]
    })

    if (existedAdmin) {
        throw new ApiError(409, "Admin with email or username already exists")
    }

    const admin = await Admin.create({
        role: role.toLowerCase(),
        companyName,
        email, 
        phoneNumber,
        password
    })

    const createdAdmin = await Admin.findById(admin._id).select(
        "-password -refreshToken"
    )

    if (!createdAdmin) {
        throw new ApiError(500, "Something went wrong while registering the admin")
    }

    return res.status(201).json(
        new ApiResponse(200, createdAdmin, "Admin registered Successfully")
    )

} )

const loginAdmin = asyncHandler(async (req, res) =>{
    // req body -> data
    // username or email
    //find the user
    //password check
    //access and referesh token
    //send cookie

    const {email, phoneNumber, password} = req.body

    if (!phoneNumber && !email) {
        throw new ApiError(400, "phone number or email is required")
    }

    const admin = await Admin.findOne({
        $or: [{phoneNumber}, {email}]
    })

    if (!admin) {
        throw new ApiError(404, "Admin does not exist")
    }

   const isPasswordValid = await admin.isPasswordCorrect(password)

   if (!isPasswordValid) {
    throw new ApiError(401, "Invalid admin credentials")
    }

   const {accessToken, refreshToken} = await generateAccessAndRefereshTokens(admin._id)

    const loggedInAdmin = await Admin.findById(admin._id).select("-password -refreshToken")

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
                admin: loggedInAdmin, accessToken, refreshToken
            },
            "Admin logged In Successfully"
        )
    )

})

const logoutAdmin = asyncHandler(async(req, res) => {
    await Admin.findByIdAndUpdate(
        req.admin._id,
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
    .json(new ApiResponse(200, {}, "Admin logged Out"))
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
    
        const admin = await Admin.findById(decodedToken?._id)
    
        if (!admin) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== admin?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(admin._id)
    
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

    

    const admin = await Admin.findById(req.admin?._id)
    const isPasswordCorrect = await admin.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    admin.password = newPassword
    await admin.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


const getCurrentAdmin = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.admin,
        "Admin fetched successfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req, res) => {
    const {companyName, email, phoneNumber} = req.body

    if (!companyName || !email || !phoneNumber) {
        throw new ApiError(400, "At least one field is required to change")
    }

    const admin = await Admin.findByIdAndUpdate(
        req.admin?._id,
        {
            $set: {
                companyName,
                email: email,
                phoneNumber: phoneNumber
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, admin, "Account details updated successfully"))
});

const fetchClientsData = asyncHandler(async(req, res) => {
    const admin = req.admin
    const clients = await User.find({serviceProvider: admin._id}).select("-password -refreshToken");
    if(!clients) {
        throw new ApiError(404, "No clients found")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, clients, "Clients fetched successfully"))
});

const fetchAccidentData = asyncHandler(async(req, res) => {
    const admin = req.admin
    const accidentData = await AccidentData.aggregate([
        {
            $lookup: {
                from: "users",
                localField: "victim",
                foreignField: "_id",
                as: "victimDetails"
            }
        },
        {
            $unwind: "$victimDetails"
        },
        {
            $match: {
                "victimDetails.serviceProvider": admin._id
            }
        },
        {
            $project: {
                location: 1,
                speed: 1,
                isDrowsy: 1,
                isOversped: 1,
                createdAt: 1,
                "victimDetails.fullName": 1,
                "victimDetails.email": 1,
                "victimDetails.phoneNumber": 1,
                "victimDetails.photo": 1,
                "victimDetails.age": 1,
                "victimDetails.gender": 1,
                "victimDetails.vehicleModel": 1,
                "victimDetails.vehicleNumber": 1
            }
        }
    ])

    if(!accidentData || accidentData.length === 0) {
        throw new ApiError(404, "No accident data found")
    }

    return res
    .status(200)
    .json(new ApiResponse(200, accidentData, "Accident data fetched successfully"))
})

const fetchAllCompanies = asyncHandler(async(req, res) => {
    const companies = await Admin.find({}).select("companyName -_id")
    if(!companies || companies.length === 0) {
        throw new ApiError(404, "No companies found")
    }
    return res
    .status(200)
    .json(new ApiResponse(200, companies, "Companies fetched successfully"))
})

export {
    registerAdmin,
    loginAdmin,
    logoutAdmin,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentAdmin,
    updateAccountDetails,
    fetchClientsData,
    fetchAccidentData,
    fetchAllCompanies
}