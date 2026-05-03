import * as SecureStore from 'expo-secure-store'
import type { User } from '../types'

export const saveToken = (token: string) => SecureStore.setItemAsync('accessToken', token)
export const getToken = () => SecureStore.getItemAsync('accessToken')
export const clearToken = () => SecureStore.deleteItemAsync('accessToken')

export const saveUser = (user: User) =>
  SecureStore.setItemAsync('user', JSON.stringify(user))

export const getUser = async (): Promise<User | null> => {
  const data = await SecureStore.getItemAsync('user')
  return data ? (JSON.parse(data) as User) : null
}

export const clearUser = () => SecureStore.deleteItemAsync('user')
