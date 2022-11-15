
import { TodoItem } from '../models/TodoItem'
import { CreateTodoRequest } from '../requests/CreateTodoRequest'
import { getUserId } from '../lambda/utils'
import * as uuid from 'uuid'

// // TODO: Implement businessLogic
export function  buildTodo(todoRequest: CreateTodoRequest, event): TodoItem {
  const todo = {
    todoId: uuid.v4(),
    createdAt: new Date().toISOString(),
    userId: getUserId(event),
    done: false,
    attachmentUrl: '',
    ...todoRequest
  }

  return todo as TodoItem
}
