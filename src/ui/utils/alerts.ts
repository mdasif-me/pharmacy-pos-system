import Swal from 'sweetalert2'

/**
 * Show a success message using SweetAlert
 */
export const showSuccess = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'success',
    title: title,
    text: message,
    confirmButtonColor: '#046C2E',
    timer: 2000,
    timerProgressBar: true,
    showConfirmButton: false,
  })
}

/**
 * Show an error message using SweetAlert
 */
export const showError = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'error',
    title: title,
    text: message,
    confirmButtonColor: '#ef4444',
  })
}

/**
 * Show a warning message using SweetAlert
 */
export const showWarning = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'warning',
    title: title,
    text: message,
    confirmButtonColor: '#f59e0b',
  })
}

/**
 * Show an info message using SweetAlert
 */
export const showInfo = (title: string, message?: string) => {
  return Swal.fire({
    icon: 'info',
    title: title,
    text: message,
    confirmButtonColor: '#3b82f6',
  })
}

/**
 * Show a confirmation dialog
 */
export const showConfirmation = (
  title: string,
  message?: string,
  confirmButtonText: string = 'Yes',
  cancelButtonText: string = 'No'
) => {
  return Swal.fire({
    icon: 'question',
    title: title,
    text: message,
    showCancelButton: true,
    confirmButtonColor: '#046C2E',
    cancelButtonColor: '#ef4444',
    confirmButtonText: confirmButtonText,
    cancelButtonText: cancelButtonText,
  })
}

/**
 * Show a confirmation dialog specifically for logout
 */
export const showLogoutConfirmation = () => {
  return Swal.fire({
    icon: 'question',
    title: 'Logout',
    text: 'Are you sure you want to logout?',
    showCancelButton: true,
    confirmButtonColor: '#046C2E',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Logout',
    cancelButtonText: 'Cancel',
  })
}

/**
 * Show a confirmation dialog for delete operations
 */
export const showDeleteConfirmation = (itemName: string = 'this item') => {
  return Swal.fire({
    icon: 'warning',
    title: 'Delete',
    text: `Are you sure you want to delete ${itemName}? This action cannot be undone.`,
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
  })
}

/**
 * Show a loading/processing dialog
 */
export const showLoading = (message: string = 'Processing...') => {
  return Swal.fire({
    title: message,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading()
    },
  })
}

/**
 * Close the currently open SweetAlert
 */
export const closeAlert = () => {
  return Swal.close()
}

/**
 * Hide the SweetAlert
 */
export const hideAlert = () => {
  return Swal.hideLoading()
}
