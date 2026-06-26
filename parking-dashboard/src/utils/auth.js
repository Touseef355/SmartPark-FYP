// AFTER LOGIN TOKENS ARE SAVED HERE

export function getUser() {
  const name = localStorage.getItem("user_name") || ""
  const role = (localStorage.getItem("user_role") || "").toLowerCase()
  const site_id = localStorage.getItem("site_id")
  const user_id = localStorage.getItem("user_id")
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?"

  return { name, role, initials, site_id, user_id }
}

export function getToken() {
  return localStorage.getItem("access_token")
}

export function logout() {
  localStorage.removeItem("access_token")
  localStorage.removeItem("refresh_token")
  localStorage.removeItem("user_name")
  localStorage.removeItem("user_role")
  localStorage.removeItem("user")
  localStorage.removeItem("site_id")
  localStorage.removeItem("user_id")
  localStorage.removeItem("user_email")
  localStorage.removeItem("cashier_type")
  window.location.href = "http://127.0.0.1:8000/landing/index.html"
}