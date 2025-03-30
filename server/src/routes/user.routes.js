import { Router } from "express";
import { 
    loginUser, 
    logoutUser, 
    registerUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateUserPhoto,
    updateAccountDetails,
    uploadAccidentData,
    fetchEmergencyContacts,
    deleteAccidentData
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router()

router.route("/register").post(
    upload.fields([
        {
            name: "photo",
            maxCount: 1
        }
    ]),
    registerUser
    )

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,  logoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").get(verifyJWT, getCurrentUser)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/photo").patch(verifyJWT, upload.single("photo"), updateUserPhoto)
router.route("/upload-accident").post(verifyJWT, uploadAccidentData)
router.route("/fetch-emergency-contacts").get(verifyJWT, fetchEmergencyContacts)
router.route("/delete-accident/:id").delete(verifyJWT, deleteAccidentData)
export default router