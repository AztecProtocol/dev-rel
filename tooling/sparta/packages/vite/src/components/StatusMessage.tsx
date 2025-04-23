import React from "react";

interface StatusMessageProps {
	message: string;
	isError: boolean;
}

const StatusMessage: React.FC<StatusMessageProps> = ({ message, isError }) => {
	const statusClass = `status ${isError ? "error" : "success"}`;

	return <div className={statusClass}>{message}</div>;
};

export default StatusMessage;
