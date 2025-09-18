const Coupon = require('../../models/couponManagement/couponModel'); // adjust path if needed

// Render coupon page
const coupon = (req, res) => {
  res.render('pages/couponManagement/coupon');
};

// ✅ Create new coupon
const createCoupon = async (req, res) => {
    console.log(req.body);
  try {
    const { couponTitle, couponFor, coupanType, couponValue, validFrom, validTill } = req.body;

    if (coupanType == 1) {
      if (couponValue < 0) {
        return res.status(400).json({ error: "Value should not be negative" });
      }
    }

    // Validate percentage if type = 2 (percentage)
    if (coupanType == 2) {
      if (couponValue < 0 || couponValue > 100) {
        return res.status(400).json({ error: "Percentage value must be between 0 and 100" });
      }
    }

    // Validate dates
    if (new Date(validFrom) >= new Date(validTill)) {
      return res.status(400).json({ error: "Valid From date must be earlier than Valid Till date" });
    }

    const coupon = new Coupon({
      couponTitle,
      couponFor,
      coupanType,
      couponValue,
      validFrom,
      validTill,
    });

    await coupon.save();
    return res.status(201).json({ message: "Coupon created successfully", coupon });
  } catch (err) {
    console.error("Error creating coupon:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Get all coupons (with search + pagination for DataTables)
const getCoupans = async (req, res) => {
  try {
    const { start, length, search, order, draw } = req.body; // ✅ POST uses body
    const startIndex = parseInt(start) || 0;
    const pageSize = parseInt(length) || 10;
    const searchValue = search?.value || "";
    let query = {};
    let sort = {};

    // 🔍 Global search
    if (searchValue) {
      query.$or = [
        { couponTitle: new RegExp(searchValue, "i") },
        { couponValue: new RegExp(searchValue, "i") },
        { coupanType: new RegExp(searchValue, "i") },
        { status: new RegExp(searchValue, "i") }
      ];
    }

    // 📌 Sorting
    if (order && order.length > 0) {
      const columnIndex = order[0].column;
      const sortDirection = order[0].dir === "asc" ? 1 : -1;
      switch (parseInt(columnIndex)) {
        case 1: sort.couponTitle = sortDirection; break;
        case 2: sort.coupanType = sortDirection; break;
        case 3: sort.couponValue = sortDirection; break;
        case 4: sort.status = sortDirection; break;
        case 5: sort.validFrom = sortDirection; break;
        case 6: sort.validTill = sortDirection; break;
        default: sort.createdAt = -1; break;
      }
    } else {
      sort.createdAt = -1;
    }

    // 📊 Fetch with pagination
    const coupons = await Coupon.find(query)
      .skip(startIndex)
      .limit(pageSize)
      .sort(sort);

    const totalRecords = await Coupon.countDocuments();
    const filteredRecords = await Coupon.countDocuments(query);

    res.json({
      draw: Number(draw) || 0,
      recordsTotal: totalRecords,
      recordsFiltered: filteredRecords,
      data: coupons
    });
  } catch (err) {
    console.error("Error fetching coupons:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};


// ✅ Get single coupon
const getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });

    return res.status(200).json(coupon);
  } catch (err) {
    console.error("Error fetching coupon:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Update status
const updateCouponStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!coupon) return res.status(404).json({ error: "Coupon not found" });

    return res.status(200).json({ message: "Coupon status updated successfully", coupon });
  } catch (err) {
    console.error("Error updating coupon:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Update coupon
const updateCoupon = async (req, res) => {
  try {
    const { couponTitle, couponFor, coupanType, couponValue, validFrom, validTill, status } = req.body;

    if (coupanType == 2) {
      if (couponValue < 0 || couponValue > 100) {
        return res.status(400).json({ error: "Percentage value must be between 0 and 100" });
      }
    }

    if (new Date(validFrom) >= new Date(validTill)) {
      return res.status(400).json({ error: "Valid From date must be earlier than Valid Till date" });
    }

    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      { couponTitle, couponFor, coupanType, couponValue, validFrom, validTill, status },
      { new: true }
    );

    if (!coupon) return res.status(404).json({ error: "Coupon not found" });

    return res.status(200).json({ message: "Coupon updated successfully", coupon });
  } catch (err) {
    console.error("Error updating coupon:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ Delete coupon
const deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ error: "Coupon not found" });

    return res.status(200).json({ message: "Coupon deleted successfully" });
  } catch (err) {
    console.error("Error deleting coupon:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  coupon,
  createCoupon,
  getCoupans,
  getCouponById,
  updateCouponStatus,
  updateCoupon,
  deleteCoupon
};
