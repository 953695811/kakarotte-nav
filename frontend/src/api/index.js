import request from './request'

export const getCategories = () => request.get('/categories')
export const getNavigation = (category) => request.get(`/navigation/${category}`)
export const getAllNavigation = () => request.get('/navigation')
export const searchNavigation = (keyword, category = '') => {
  const params = { keyword }
  if (category) params.category = category
  return request.get('/navigation/search', { params })
}
