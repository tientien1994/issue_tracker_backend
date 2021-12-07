import excel from "exceljs"
import moment from "moment"
import { numberWithCommas } from "utils/common"
import _ from "lodash"
import { isBlankString } from "utils/validate"
import { ObjectId } from "mongodb"

async function companyReport(req, res, context) {
  let workbook = new excel.Workbook()
  workbook.creator = process.env.COMPANY_NAME
  workbook.lastModifiedBy = process.env.COMPANY_NAME
  workbook.created = new Date()
  workbook.modified = new Date()
  //FIXME title
  let title = `Company Report`
  
  //FIXME data
  const { mongo } = context
  const { reportId } = req.params

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=" + "Company Report.xlsx"
  )

  return workbook.xlsx.write(res).then(function () {
    res.status(200).end()
  })
}

export default companyReport
