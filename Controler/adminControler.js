const bcrypt = require("bcrypt")
const Customer = require('../Models/customerModel')
const productCategry = require("../Models/productCategory")
const Product = require("../Models/productModel")
const Order = require("../Models/orderModel")
const Coupon = require("../Models/couponModel")
const Offer = require("../Models/offerModel")
const sharp = require("sharp")



//**ADMIN LOGIN AND LOGOUT**//


//RENDER ADMIN LOGIN
const loadAaminLogin = async (req, res, next) => {
    try {
        if (!req.session.admin) {
            res.render("admin/adminLogin", { message: "" })
        } else {
            res.redirect("/admin/dashboard")
        }
    } catch (error) {
        console.log(error.message);
    }
}//lOGIN VALIDATION
const loginValidation = async (req, res, next) => {
    try {

        const { email, password } = req.body

        if (email === "") { // Use '===' for equality comparison

            res.render("admin/adminLogin", { message: "Email is required" });

        } else if (password === "") { // Use '===' for equality comparison

            res.render("admin/adminLogin", { message: "Password is required" });

        } else {

            // Handle the case where both email and password are provided

            // You might want to continue processing the login here
            next()

        }
    } catch (error) {
        console.log(error.message);
    }
}//IF CHECK THE ADMIN IS VALID THEN GIVE ACCCESS  
const adminValid = async (req, res) => {
    try {
        const { email, password } = req.body
        const validEmail = await Customer.findOne({ email })


        if (!validEmail || validEmail === "undefined" || validEmail === null || validEmail === "") {

            return res.render("admin/adminLogin", { message: "email is not valid" })

        } else if (!/^\S+@\S+\.\S+$/.test(email) || email === "") {
            res.render("admin/adminLogin", { message: "Invalid Email " })
        } else {

            const dpassword = validEmail.password
            const matchPassword = await bcrypt.compare(password, dpassword)


            if (!matchPassword) {
                res.render("admin/adminLogin", { message: "passowrd is miss match" })
            } else {
                if (validEmail.is_Admin === true) {
                    req.session.admin = validEmail._id
                    res.redirect("/admin/dashboard")
                } else {
                    res.render("admin/adminLogin", { message: "Your are not the admin" })
                }
            }
        }



    } catch (error) {
        console.log(error.message);
    }
}//ADMIN LOGOUT
const adminLogout = (req, res) => {
    try {
        if (req.session.admin) {
            req.session.destroy()
            return res.redirect("/admin/dashboard")

        }

    } catch (error) {
        console.log(error.message);
    }
}


//**CUSTOMER MANAGMENT**//


//DISPLAY ALL CUSTOMERS
const displayCustomers = async (req, res) => {
    try {   
        const page = parseInt(req.query.page) || 1;
        const pageSize = 10;
        const skip = (page - 1) * pageSize;
        const users = await Customer.find({
            is_varified: true,
            is_Admin: false,
        });
        const len = await Customer.find({
            is_admin: false,
            is_varified: true,
        })
        return res.render("admin/user", {
            users,
            len,
            currentPage: page,
        });
    } catch (error) {
        console.error(error.message);
    }
}//CUSTOMER UNBLOCKING
const UnblockTheUser = async (req, res) => {
    try {
        const { id } = req.query
        const userUpdated1 = await Customer.updateOne({ _id: id }, { $set: { is_block: false } });
        if (userUpdated1) {

            return res.redirect('/admin/Customers')
        }
    } catch (error) {
        console.log(error.message);
    }
}//CUSTOMER BLOCKING 
const blockTheUser = async (req, res) => {
    try {

        const { id } = req.query
        const userUpdated = await Customer.updateOne({ _id: id }, { $set: { is_block: true } })
        if (userUpdated) {
            return res.redirect('/admin/Customers')
        }
    } catch (error) {
        console.log(error.message);
    }
}


//**CATEGORY MANAGEMNT**//


//CREATE A CATEGORIES
const addProductCategory = async (req, res) => {
    const catename = req.body.Categoryname

    if (!req.body.Categoryname || !req.file) {

        req.flash('error', 'Fill all fields..............');
        return res.redirect("/admin/product/add-category")
    }
    const exist = await productCategry.find({ categoryName: catename })

    if (exist.length !== 0) {
        console.log(exist);
        req.flash('error', 'This category allready exist.......');
        return res.redirect("/admin/product/add-category")
    }
    try {

        const category = new productCategry({
            categoryName: req.body.Categoryname,
            // SubCategoryName: req.body.SubCategoryname,
            description: req.body.description,
            image: {
                data: req.file.buffer,
                contentType: req.file.mimetype
            }

        });
        if (req.body.offer) {
            const offer = Offer.find(req.body.offer)
            if (offer.is_deleted === false) {
                category.offer = req.body.offer
            }
        }

        await category.save();
        // console.log("Category saved successfully.");
        res.redirect("/admin/product/Category-management")


    } catch (error) {
        console.error(error);
        req.flash('error', 'An error occurred while adding the category.');
        res.redirect("/admin/product/add-category");
    }
}//LIST ALL THE CATEGORIES
const loadCategory = async (req, res) => {
    let page = req.query.page
    const pageSize = 10

    try {
        page = parseInt(req.query.page) || 1;
        const skip = ((page - 1) * pageSize);
        const currentPage = page

        const len = await productCategry.find().sort({ _id: -1 })
        const Categores = await productCategry.find().sort({ _id: -1 }).skip(skip).limit(pageSize).populate("offer")


        res.render("admin/productCategory", { Categores, len, currentPage })

    } catch (error) {
        console.log(error.message);
    }
}//SOFT DELETE
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params
        const deleteCategory = await productCategry.findByIdAndDelete({ _id: id })
        if (deleteCategory) {
            res.redirect("/admin/product/Category-management")
        }

    } catch (error) {
        console.log(error.message)
    }
}//RENDER THE EDIT CATEGORY PAGE
const loadEditCategory = async (req, res) => {
    try {
        const offers = await Offer.find({ is_deleted: false })
        const { id } = req.params
        console.log(id + "HHHHHHHHHHHHHHHHHHHHHH")
        const EditCategory = await productCategry.findById({ _id: id }).populate("offer")

        if (EditCategory) {
            return res.render("admin/editCategory", { EditCategory, message: "", id, offers })
        }

    } catch (error) {

    }
}// EDITING THE CATEGORY
const EditCategory = async (req, res) => {
    console.log(req.body);
    console.log(req.body.offer.length);
    const id = req.query.id
    try {

        const editedCategory = await productCategry.findById(id);
        console.log(req.body)
        if (editedCategory) {

            editedCategory.categoryName = req.body.Categoryname
            editedCategory.description = req.body.description


            if (req.file) {
                editedCategory.image.data = req.file.buffer;
                editedCategory.image.contentType = req.file.mimetype;
            }
            if (req.body.offer === "Delete") {
                await Product.updateMany({ category: id }, { $set: { categoryOfferPrice: 0 } })
                await productCategry.findByIdAndUpdate(id, { $unset: { offer: {} } });
            } else if (req.body.offer.length > 10) {
                const offer = await Offer.findById(req.body.offer);
                if (offer.is_deleted === false) {
                    await productCategry.findByIdAndUpdate(id, { $set: { offer: req.body.offer } });
                    const products = await Product.find({ category: id });
                    for (let i = 0; i < products.length; i++) {
                        let discountPercentage = offer.discount;
                        let regularPrice = products[i].price;
                        let offerPrice = regularPrice - Math.floor((discountPercentage / 100) * regularPrice);
                        products[i].categoryOfferPrice = offerPrice;
                        await products[i].save();
                    }
                } else {
                    await productCategry.findByIdAndUpdate(id, { $unset: { offer: {} } });
                    const products = await Product.find({ category: id });
                    for (let i = 0; i < products.length; i++) {
                        products[i].categoryOfferPrice = 0;
                        await products[i].save();
                    }

                }


            }
            await editedCategory.save();
            return res.redirect("/admin/product/Category-management");
        } else {
            return res.status(404).send("Category not found.");
        }
    } catch (error) {
        console.error(error.message);
        return res.status(500).send("Internal Server Error");
    }
};//RENDER THE ADD CATEGORY PAGE
const loadAddCategory = async (req, res) => {
    try {
        const offers = await Offer.find({ is_deleted: false })
        res.render('admin/addCategory', {
            message: '',
            offers: offers,
            error: req.flash("error")
        });
    } catch (error) {
        console.log(error.message)
    }
}//DELETE THE CATEGORY IMAGE
const deleteCategoryImg = async (req, res) => {
    try {
        const categoryId = req.params.id
        const category = await productCategry.findByIdAndUpdate(categoryId, { $unset: { image: {} } })
        return res.redirect(`/admin/Category/${categoryId}/Edit-Category`)
    } catch (error) {
        console.log(error.message)
    }
}


//**PRODUCT MANAGEMENT**//


// RENDER THE PRODUCT CREATE PAGE
const loadProductCreate = async (req, res) => {
    try {
        const Categories = await productCategry.find()
        const offers = await Offer.find({ is_deleted: false })


        res.render("admin/addproduct", { message: "", Categories, offers, error: req.flash("error") });

    } catch (error) {
        console.log(error.message);
    }
}//ADD THE NEW PRODUCT INTO THE DATABASE
const createProduct = async (req, res) => {



    const { productName, manufacturerName, brandName, id_No, price,
        offer, releaseDate, stockCount, description, category, tags,
        inStock, outOfStock, images, color, Metrial } = req.body;

       
    try {
        if (!productName || !manufacturerName) {
            req.flash('error', 'All fields are required. Please fill in all fields....');
            return res.redirect("/admin/product/create")

        }

    
        let stock 
        if(req.body.inStock == "inStock"){
            stock = true
        }else if (req.body.inStock == "outOfStock"){
            stock = false
        }
        const product = new Product({
            product_name: productName,
            manufacturer_name: manufacturerName,
            brand_name: brandName,
            idendification_no: id_No,
            price: req.body.price,
            relese_date: releaseDate,
            stock_count: stockCount,
            description: req.body.description,
            category: category,
            in_stock: stock,
            color: req.body.color,
            meterial: Metrial,
        });

        const croppedImages = await Promise.all(
            req.files.map(async (file, i) => {
                const filename = `-${Date.now()}test-${i + 1}.jpeg`;
                const croppedImageBuffer = await sharp(file.buffer)
                    .resize(540, 560)
                    .toFormat('jpeg')
                    .jpeg({ quality: 90 })
                    .toBuffer();
                product.images.push({ data: croppedImageBuffer, contentType: 'image/jpeg' });
                return {
                    filename: filename,
                    buffer: croppedImageBuffer,
                };
            })
        );
        if (req.body.offer) {
            product.offer = req.body.offer
            const offerm = await Offer.findById(req.body.offer)
            if (offerm.is_deleted === false) {
                const regularPrice = req.body.price
                const newprice = regularPrice - Math.floor((offerm.discount / 100) * regularPrice)
                product.offerPrice = newprice
            } else {
                product.offerPrice = 0
            }


        }


        const CategoryOffer = await productCategry.findById(category)

        if (CategoryOffer.offer) {
            const offerm = await Offer.findById(CategoryOffer.offer)
            if (offerm.is_deleted === false) {
                const dicountPercenatge = offerm.discount
                const regularPrice = req.body.price
                const newprice = regularPrice - Math.floor((dicountPercenatge / 100) * regularPrice)
                product.categoryOfferPrice = newprice
            } else {
                product.categoryOfferPrice = 0
            }
        }

        await product.save();
        return res.redirect("/admin/product");
    } catch (error) {
        console.log(error.message);
        return res.status(500).send("Error creating the product.");
    }
}//LIST THE ALL PRODUCT 
const loadProductPage = async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = 10;
    const skip = ((page - 1) * pageSize);
    const currentPage = page;
    const query = req.query.query || ''; // Get the search query from the request

    try {
        let products;
        let len;

        if (query) {
            // If there's a query, filter products by name using regex
            products = await Product.find({ product_name: { $regex: query, $options: 'i' } })
                .skip(skip)
                .limit(pageSize)
                .populate("offer")
                .populate("category")
            len = await Product.find({ product_name: { $regex: query, $options: 'i' } });
        } else {
            // If no query, retrieve all products
            products = await Product.find()
                .skip(skip)
                .limit(pageSize)
                .populate("offer")
                .populate("category")
            len = await Product.find();
        }

        if (products) {
            return res.render('admin/products', { products, len, currentPage, query });
        } else {
            console.log("Products not found");
        }
    } catch (error) {
        console.log(error.message);
    }
}//RENDER THE PRODUCT EDIT PAGE
const loadProductEditPage = async (req, res) => {
    try {
        const id = req.params.id
        const pro = await Product.findOne({ _id: id })
        let product
        if (pro.offer) {
            product = await Product.findOne({ _id: id }).populate("offer").populate("category")
        } else {
            product = await Product.findOne({ _id: id }).populate("category")
        }

        const Categories = await productCategry.find({ categoryName: { $ne: pro.category } }).populate("offer")
        const offers = await Offer.find({ is_deleted: false })
        res.render("admin/Edit", { message: "", product, id, Categories, offers })

    } catch (error) {
        console.log(error.message);
    }
}//EDITING THE PRODUCT DETAILS
const editProduct = async (req, res) => {

    const { productName, manufacturerName, brandName, id_No,
        price, releaseDate, description, stockCount, category
        , outOfStock, images, tags, color, Metrial, id, offer } = req.body;
    try {
        console.log(req.body);
        let stock 
        if(req.body.inStock == "inStock"){
            stock = true
        }else if (req.body.inStock == "outOfStock"){
            stock = false
        }
        
        const productId = id;
        const updateFields = {
            product_name: productName,
            manufacturer_name: manufacturerName,
            brand_name: brandName,
            idendification_no: id_No,
            price: req.body.price,
            relese_date: releaseDate,
            stock_count: stockCount,
            description: req.body.description,
            product_tags: tags,
            in_stock: stock,
            color: req.body.color,
            meterial: Metrial,
        };
        if (req.body.category && req.body.category !== "" && req.body.category.length > 10) {
            const CategoresOffer = await productCategry.findById(req.body.category)
            if (CategoresOffer.offer) {
                const caOffer = await Offer.findById(CategoresOffer.offer)
                if (caOffer.is_deleted === false) {
                    updateFields.category = req.body.category
                    updateFields.categoryOfferPrice = req.body.price - Math.floor((caOffer.discount / 100) * req.body.price);
                }
            } else {
                updateFields.categoryOfferPrice = 0
                updateFields.category = req.body.category
            }
        }
        if (req.body.offer && req.body.offer.length > 10) {
            updateFields.offer = req.body.offer
            const proOffer = await Offer.findById(req.body.offer)
            if (proOffer.is_deleted === false) {
                updateFields.offerPrice = req.body.price - Math.floor((proOffer.discount / 100) * req.body.price)
            }
        }
        if (req.body.offer === "Delete") {
            await Product.findByIdAndUpdate(productId, {
                $unset: { offer: 1 }, // Unset the 'offer' field
                $set: { offerPrice: 0 } // Set the 'offerPrice' field to 0
            });
        }
        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            { $set: updateFields },
            { new: true } // To get the updated document back
        );
        if (req.files) {
            const croppedImages = await Promise.all(
                req.files.map(async (file, i) => {
                    const filename = `-${Date.now()}test-${i + 1}.jpeg`;
                    const croppedImageBuffer = await sharp(file.buffer)
                        .resize(540, 560)
                        .toFormat('jpeg')
                        .jpeg({ quality: 90 })
                        .toBuffer();
                    updatedProduct.images.push({ data: croppedImageBuffer, contentType: 'image/jpeg' });
                    return {
                        filename: filename,
                        buffer: croppedImageBuffer,
                    };
                })
            );
            await updatedProduct.save();
        }

        if (updatedProduct) {
            console.log("Product edited successfully.");
            return res.redirect("/admin/product")
        }
    } catch (error) {
        console.log(error.message);
    }
}//PRODUCT SOFT DELETING 
const productDeactivate = async (req, res) => {
    try {

        const id = req.params.id
        const change = await Product.updateOne({ _id: id }, { $set: { is_delete: true } })

        if (change) {

            return res.redirect('/admin/product')
        }
    } catch (error) {
        console.log(error.message);
    }
}//ACTIVE THE PRODUCT
const productActivate = async (req, res) => {
    try {
        const id = req.params.id
        const change = await Product.updateOne({ _id: id }, { $set: { is_delete: false } })
        if (change) {
            return res.redirect('/admin/product')
        }
    } catch (error) {
        console.log(error.message);
    }
}//DELETE PREVEIW IMAGES 
const deleteImgDelete = async (req, res) => {
    const id = req.params.id
    const imageId = req.params.imageId
    console.log(id + "XXXX" + imageId);
    try {
        console.log("HADHI---------------------------------------------------------------------------- HASSAN")
        const deleteimg = await Product.findByIdAndUpdate(
            { _id: id },
            { $pull: { "images": { _id: imageId } } },
            { new: true }
        );

        // 650c7fbf086081c38a
        if (deleteimg) {

            // console.log(deleteimg)
            return res.redirect(`/admin/product/${req.params.id}/Edit`)
        }
    } catch (error) {
        console.log(error.message)
    }
}


//**ORDER MANAGEMENT**//


//LIST ALL ORDERS
const loadOrder = async (req, res) => {
    let page = req.query.page
    const pageSize = 10
    try {
        page = parseInt(req.query.page) || 1;
        const skip = ((page - 1) * pageSize);
        const currentPage = page

        const len = await Order.find()
        const orders = await Order.find()
            .sort({ returnRequest: -1 }) // Sort by "returnRequest" in descending order
            .skip(skip)
            .limit(pageSize)
            .populate("user")
            .populate("products.product")
            .populate("deliveryAddress")
            .exec();

        if (orders) {
            return res.render("admin/order", { orders, len, currentPage })

        }
        console.log("GOT ERROR")
    } catch (error) {
        consoel.log(error.message)
    }
}//UPDATIN ORDER STATUS
const updateOrderStatus = async (req, res) => {
    const action = req.query.action;
    const orderId = req.query.orderId;
    try {
        const order = await Order.findByIdAndUpdate(
            { _id: orderId },
            { $set: { returnRequest: action } }
        );
        console.log(order);
        return res.redirect("/admin/orders");
    } catch (error) {
        console.error(error.message);
        // Handle the error appropriately (e.g., send an error response)
        res.status(500).send("Internal Server Error");
    }
};// UPDATING PRODUCT RETURN STATUS 
const updateReturnRequest = async (req, res) => {
    try {
        console.log(req.query);
        const action = req.query.action;
        const orderId = req.query.orderId;
        const order = await Order.findByIdAndUpdate(
            { _id: orderId },
            { $set: { return_Status: action } }
        );
        const referer = req.headers.referer;
                const originalPage = referer || '/';
                res.redirect(originalPage)
        if (action === "Completed") {
            const updateResult = await Customer.findByIdAndUpdate(
                order.user,
                {
                    $inc: { wallet: order.totalAmount },
                    $push: {
                        walletHistory: {
                            date: Date.now(),
                            amount: order.totalAmount,
                            message: `Product returned amount credited into wallet ${order.totalAmount}`,
                        },
                    },
                },
                { new: true } // To get the updated customer document
            )
            if(updateResult){
                const referer = req.headers.referer;
                const originalPage = referer || '/';
                res.redirect(originalPage)
            }
        }


    } catch (error) {
        console.log(error.message);
    }
}


//**ORDER MANAGEMENT**//


//LIST ALL ORDERS
const loadCouponPage = async (req, res) => {
    try {
        const allCoupon = await Coupon.find()
        return res.render("admin/coupon", { allCoupon })

    } catch (error) {
        console.log(error.message)
    }
}//RENDER THE CREATE COUPON PAGE
const loadAddCoupon = async (req, res) => {
    try {
        return res.render("admin/addCoupon")
    } catch (error) {
        console.log(error.message);
    }
}//CREATE THE NEW COUPON 
const createCoupon = async (req, res) => {
    console.log(req.body)
    const { couponName, type, MinimumpurchaseAmount, amountOrPercentage, Description } = req.body;
    try {

        // Create a function to generate a unique coupon code
        function generateCouponCode() {
            const length = 6;
            const characters = '0123456789';
            let couponCode = '';

            for (let i = 0; i < length; i++) {
                const randomIndex = Math.floor(Math.random() * characters.length);
                couponCode += characters.charAt(randomIndex);
            }

            return couponCode;
        }


        const code = generateCouponCode();
        const CouponCode = new Coupon({
            coupon_name: couponName,
            description: Description,
            discount_type: type,
            minimumPurchaseAmount: MinimumpurchaseAmount,
            discount_amount_or_percentage: amountOrPercentage,
            code: code, // Assign the generated code to the 'code' property
        });

        if (CouponCode) {
            await CouponCode.save();
            console.log("coupon saved");
            return res.redirect("/admin/coupon-management");
        } else {
            console.log("not working");
        }

        return res.render("admin/addCoupon", { message: "Please fill in all fields...." });


    } catch (error) {
        // Handle the error appropriately
        console.error(error);
        // Return an error response if necessary
        return res.status(500).send("Error creating the coupon.");
    }
}//COUPON SOFT DELETE 
const deleteCoupon = async (req, res) => {
    const id = req.params.id
    try {
        const deleteCoupon = await Coupon.findByIdAndUpdate(id, { $set: { coupon_done: true } })
        return res.redirect("/admin/coupon-management")
    } catch (error) {
        console.log(error.message);
    }
}//ACTIVE THE COUPON
const ActiveCoupon = async (req, res) => {
    const id = req.params.id
    try {
        const ActiveCoupon = await Coupon.findByIdAndUpdate(id, { $set: { coupon_done: false } })
        return res.redirect("/admin/coupon-management")
    } catch (error) {
        console.log(error.message);
    }
}


module.exports = {
    loadAaminLogin, loginValidation, adminValid, adminLogout, displayCustomers,
    UnblockTheUser, blockTheUser, addProductCategory, loadCategory, deleteCategory, loadAddCategory, loadProductCreate,
    createProduct, loadProductPage, editProduct, loadProductEditPage, productDeactivate, productActivate, deleteImgDelete,
    loadOrder, updateOrderStatus, loadEditCategory, EditCategory, deleteCategoryImg, loadCouponPage, createCoupon, deleteCoupon,
    ActiveCoupon, loadAddCoupon, updateReturnRequest
}