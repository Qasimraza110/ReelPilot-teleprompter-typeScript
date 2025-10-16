import { useState } from "react";



const PlanTab = () => {
    // Pass user as prop if needed, or ensure it's accessible
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Function to handle the redirection process
    const handleManageSubscription = async () => {
      setIsLoading(true);
      setError(null); // Clear any previous errors
      try {
        const response = await fetch("/api/create-portal-session", {
          method: "POST",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || "Failed to create portal session."
          );
        }

        const { url } = await response.json();
        window.location.href = url; // Redirect to Stripe portal
      } catch (err) {
        console.error("Error redirecting to Stripe portal:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Could not redirect to billing portal."
        );
        setIsLoading(false); // Stop loading if there's an error
      }
    };

    // Modify the PlanTab's render logic
    return (
      <div className="p-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-white flex flex-col items-center justify-center min-h-[400px]">
        {" "}
        {/* Added min-h for better centering */}
        <h2 className="text-3xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Your Plan
        </h2>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center">
            <div className="text-xl mb-4">Redirecting to billing portal...</div>
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-500/20 border border-red-400/30 rounded-xl text-red-400 text-center">
            <p className="mb-4">Error: {error}</p>
            <p>Please try again or contact support if the issue persists.</p>
          </div>
        ) : (
          // Initial state: Show current plan info and a button to manage
          <div className="flex flex-col items-center text-center">
            <p className="text-lg text-gray-300 mb-6">
              Manage your subscription, update payment methods, or view billing
              history.
            </p>

            <button
              onClick={handleManageSubscription} // Show confirmation on first click
              className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 transform hover:scale-105"
            >
              Manage Subscription
            </button>
          </div>
        )}
      </div>
    );
};
  
export default PlanTab