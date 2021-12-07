import axios from 'axios'
import aws from 'aws-sdk'
import moment from 'moment'
import { Readable } from 'stream'

const s3Bucket = process.env.S3_BUCKET
const s3Region = process.env.S3_REGION
const AWSAccessKeyId = process.env.AWS_ACCESS_KEY_ID
const AWSSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

export async function buildReport({ skuMarginReport }) {
  const skuMarginReportNo = skuMarginReport.skuMarginReportNo
  try {
    aws.config.update({ region: s3Region })
    const s3 = new aws.S3({
      signatureVersion: 'v4',
      region: s3Region,
      accessKeyId: AWSAccessKeyId,
      secretAccessKey: AWSSecretAccessKey
    })

    let ContentType = ''
    let buffer = null
    let error = null

    try {
      const excelUrl = `${process.env.API_HOST}/export/sku-margin-report/${skuMarginReport._id.toString()}`
      const { data, headers } = await axios.get(excelUrl, {
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }, responseType: 'arraybuffer'
      })
      ContentType = headers['content-type']
      buffer = new Buffer.from(data)
    } catch (err) {
      error = err
    }
    
    if (error) {
      return { success: false, error }
    }
     
    if (!buffer) {
      return { success: false, error: `Can not download file from url ${excelUrl}` }
    }
    
    const stream = Readable.from(buffer);

    const date = moment.utc().format('YYYYMMDD')
    const randomString = Math.random().toString(36).substring(2, 7)
    const key = `pilot-erp/excel/${skuMarginReportNo}-${date}-${randomString}.xlsx`
    console.log('key :>> ', key);

    const objectParams = {
      Bucket: s3Bucket,
      Key: key,
      ContentType: ContentType,
      Body: stream,
      ACL: 'public-read'
    };

    // Create object upload promise
    const resp = await s3.upload(objectParams).promise();
    console.log('resp :>> ', resp);

    if (resp && resp.Location) {
      return {
        success: true,
        error: null,
        url: resp.Location
      }
    }

    return {
      success: false,
      error: JSON.stringify(resp)
    }

  } catch (error) {
    console.log('error :>> ', error);

    return {
      success: false,
      error: JSON.stringify(error)
    }
  }
}