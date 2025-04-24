import React /*, { type ReactNode } */ from 'react'; // ReactNode unused
// import { StepStatus } from '@reown/react-components/ProgressSteps'; // Source unknown or missing

interface VerificationResult {
	success?: boolean;
	inProgress?: boolean;
	message: string;
	score?: number;
	minimumScore?: number;
	details?: string;
}

interface VerificationStepProps {
	// number: number; // Unused
	title: string;
	description: string;
	isActive: boolean;
	isCompleted: boolean;
	buttonText?: string;
	onButtonClick?: () => void;
	showButton?: boolean;
	buttonDisabled?: boolean;
	isLoading?: boolean;
	result?: VerificationResult; // Keep original result prop
	completedContent?: React.ReactNode; // Added prop for custom completed content
	// details?: ReactNode; // Comment out details as it wasn't in original props
}

const VerificationStep: React.FC<VerificationStepProps> = ({
	title,
	description,
	isActive,
	isCompleted,
	buttonText,
	onButtonClick,
	showButton = true,
	buttonDisabled = false,
	isLoading = false,
	result, // Keep original result prop
	completedContent, // Added prop for custom completed content
	// details, // Comment out details
}) => {
	const stepClass = `step ${isActive ? "active" : ""} ${
		isCompleted ? "completed" : ""
	}`;

	return (
		<div className={stepClass}>
			<h3>{title}</h3>

			{/* Conditionally render completed content or original description/button */} 
			{isCompleted && completedContent ? (
				<div className="step-completed-content">{completedContent}</div>
			) : (
				<>
					<p>{description}</p>
					{showButton && (
						<button onClick={onButtonClick} disabled={buttonDisabled || isLoading} >
							{isLoading ? (
								<><span className="spinner"></span> Signing...</>
							) : (
								buttonText
							)}
						</button>
					)}
				</>
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
