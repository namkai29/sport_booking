const San = require("../models/san.model")

exports.getAllSan = async (req, res) => {

    try {

        const san = await San.getAll()

        res.json(san)

    } catch (error) {

        res.status(500).json({ message: error.message })

    }

}


exports.getSanByOwner = async (req, res) => {

    try {

        const chuSanId = req.user.id

        const san = await San.getByOwner(chuSanId)

        res.json(san)

    } catch (error) {

        res.status(500).json({ message: error.message })

    }

}


exports.createSan = async (req, res) => {

    try {

        const { tenSan, kieuSan, diaChi, giaThue } = req.body

        const data = {
            chuSanId: req.user.id,
            tenSan,
            kieuSan,
            diaChi,
            giaThue
        }

        await San.create(data)

        res.json({
            message: "Thêm sân thành công"
        })

    } catch (error) {

        res.status(500).json({ message: error.message })

    }

}


exports.updateSan = async (req, res) => {

    try {

        const sanId = req.params.id

        await San.update(sanId, req.body)

        res.json({
            message: "Cập nhật sân thành công"
        })

    } catch (error) {

        res.status(500).json({ message: error.message })

    }

}


exports.deleteSan = async (req, res) => {

    try {

        const sanId = req.params.id

        await San.delete(sanId)

        res.json({
            message: "Xóa sân thành công"
        })

    } catch (error) {

        res.status(500).json({ message: error.message })

    }

}