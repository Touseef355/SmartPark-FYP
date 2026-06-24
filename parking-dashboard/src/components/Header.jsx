function Header()
{
    const cashierName  = "Ali Irshad"
    const currentTime  = new Date().toLocaleTimeString()

    return(
        <div className="bg-blue-700 text-white px-6 py-4 flex justify-between items-center">
            {/* Left Side- Title */}
            <div className="flex items-center gap-3">
                <span className="text-2xl">🅿️</span>
                <h1 className="text-xl font-bold">Smart Parking</h1>
            </div>
            {/* Right Side - Cashier Info */}
            <div className="text-right">
              <p className="font-semibold">{cashierName}</p>
              <p className="text-blue-200 text-sm">Cashier | {currentTime}</p>
            </div>

        </div>
    )

}
export default Header