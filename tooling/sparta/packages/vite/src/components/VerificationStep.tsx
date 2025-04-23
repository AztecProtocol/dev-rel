import React from "react";

interface VerificationResult {
	success?: boolean;
	inProgress?: boolean;
	message: string;
	score?: number;
	minimumScore?: number;
	details?: string;
}

interface VerificationStepProps {
	number: number;
	title: string;
	description: string;
	isActive: boolean;
	isCompleted: boolean;
	buttonText?: string;
	onButtonClick?: () => void;
	showButton?: boolean;
	buttonDisabled?: boolean;
	isLoading?: boolean;
	result?: VerificationResult;
}

const VerificationStep: React.FC<VerificationStepProps> = ({
	number,
	title,
	description,
	isActive,
	isCompleted,
	buttonText,
	onButtonClick,
	showButton = false,
	buttonDisabled = false,
	isLoading = false,
	result,
}) => {
	const stepClass = `step ${isActive ? "active" : ""} ${
		isCompleted ? "completed" : ""
	}`;

	return (
		<div className={stepClass}>
			<h3>{title}</h3>
			<p>{description}</p>

			{showButton && (
				<button onClick={onButtonClick} disabled={buttonDisabled}>
					{isLoading && <span className="spinner"></span>}
					{buttonText}
				</button>
			)}

			{result && (
				<div
					className={
						result.success
							? "success"
							: result.inProgress
							? ""
							: "error"
					}
				>
					<h3>
						{result.success ? "✓" : result.inProgress ? "⏳" : "❌"}{" "}
						{result.message}
					</h3>

					{result.score !== undefined && (
						<p>Your Passport score: {result.score}</p>
					)}

					{result.minimumScore !== undefined && (
						<p>Required minimum score: {result.minimumScore}</p>
					)}

					{result.details && <p>{result.details}</p>}
				</div>
			)}
		</div>
	);
};

export default VerificationStep;
