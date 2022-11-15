import * as AWS from 'aws-sdk'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { createLogger } from '../utils/logger'
import { TodoItem } from '../models/TodoItem'
import { UpdateTodoRequest } from '../requests/UpdateTodoRequest'
const AWSXRay = require('aws-xray-sdk')

const XAWS = AWSXRay.captureAWS(AWS)

const logger = createLogger('TodosAccess')
const docClient: DocumentClient = createDynamoDBClient()
const todosTable = process.env.TODOS_TABLE
const bucketname = process.env.ATTACHMENT_S3_BUCKET
const s3 = new XAWS.S3({
  signatureVersion: 'v4'
})

// TODO: Implement the dataLayer logic
export const createTodo = async (todo: TodoItem): Promise<TodoItem> => {
  await docClient
    .put({
      TableName: todosTable,
      Item: {
        ...todo
      }
    })
    .promise()
  logger.info('Todo was created', { trc: JSON.stringify(todo) })
  return todo
}

export const getTodoById = async (todoId: string): Promise<TodoItem> => {
  const result = await docClient
    .query({
      TableName: todosTable,
      KeyConditionExpression: 'todoId = :todoId',
      ExpressionAttributeValues: {
        ':todoId': todoId
      }
    })
    .promise()

  const items = result.Items
  if (items.length !== 0) {
    return result.Items[0] as TodoItem
  }

  return null
}

export const updateAttachmentUrl = async (
  todoId: string,
  userId: string
): Promise<void> => {
  await docClient
    .update({
      TableName: todosTable,
      Key: {
        userId: userId,
        todoId: todoId
      },
      UpdateExpression: 'set attachmentUrl = :attachmentUrl',
      ExpressionAttributeValues: {
        ':attachmentUrl': `https://${bucketname}.s3.amazonaws.com/${todoId}`
      }
    })
    .promise()
}

export async function updateTodoItem(
  updateTodoRequest: UpdateTodoRequest,
  userId: string,
  todoId: string
): Promise<void> {
  await docClient
    .update({
      TableName: todosTable,
      Key: {
        userId: userId,
        todoId: todoId
      },
      UpdateExpression: 'set #name=:name, dueDate=:dueDate, done=:done',
      ExpressionAttributeValues: {
        ':name': updateTodoRequest.name,
        ':dueDate': updateTodoRequest.dueDate,
        ':done': updateTodoRequest.done
      },
      ExpressionAttributeNames: {
        '#name': 'name'
      }
    })
    .promise()

    logger.info('Todo was updated', { trc: todoId })

}

export const getAllTodosByUser = async (
  userId: string
): Promise<TodoItem[]> => {
  const result = await docClient
    .query({
      TableName: todosTable,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    })
    .promise()

  return result.Items as TodoItem[]
}

export async function deleteTodoItem(
  userId: string,
  todoId: string
): Promise<void> {
  await docClient
    .delete({
      TableName: todosTable,
      Key: {
        userId: userId,
        todoId: todoId
      }
    })
    .promise()

    logger.info('Todo was deleted', { trc: todoId })

}

export async function deleteTodoItemAttachment(
  bucketKey: string
): Promise<void> {
  await s3
    .deleteObject({
      Bucket: bucketname,
      Key: bucketKey
    })
    .promise()
}

function createDynamoDBClient() {
  if (process.env.IS_OFFLINE) {
    console.log('Creating a local DynamoDB instance')
    return new XAWS.DynamoDB.DocumentClient({
      region: 'localhost',
      endpoint: 'http://localhost:8000'
    })
  }

  return new XAWS.DynamoDB.DocumentClient()
}
