import { Router } from "express";
import { 
    loginAdmin, 
    logoutAdmin, 
    registerAdmin, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrentAdmin,
    updateAccountDetails,
    fetchClientsData,
    fetchAccidentData,
    fetchAllCompanies
} from "../controllers/admin.controller.js";
import { verifyJWT } from "../middlewares/auth.admin.middleware.js";


const router = Router()

router.route("/register").post(registerAdmin)

router.route("/login").post(loginAdmin)

//secured routes
router.route("/logout").post(verifyJWT,  logoutAdmin)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-admin").get(verifyJWT, getCurrentAdmin)
router.route("/update-account").patch(verifyJWT, updateAccountDetails)
router.route("/clients").get(verifyJWT, fetchClientsData)
router.route("/accidents").get(verifyJWT, fetchAccidentData)
router.route("/companies").get(fetchAllCompanies)

export default router