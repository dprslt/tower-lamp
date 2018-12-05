
export const ADD_ALERT = 'ADD_ALERT'
export const DELETE_ALERT = 'DELETE_ALERT'

export function addAlert(typeAlert, text){
  return {type: ADD_ALERT, text:text, typeAlert:typeAlert}
}

export function deleteAlert(id){
    return {type: DELETE_ALERT, id:id}
}