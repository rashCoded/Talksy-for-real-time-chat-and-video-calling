package com.talksy.dto;

public class SendFriendRequestDto {
    private String receiverEmail;
    private String receiverUsername;

    // Constructors
    public SendFriendRequestDto() {}

    public SendFriendRequestDto(String receiverEmail, String receiverUsername) {
        this.receiverEmail = receiverEmail;
        this.receiverUsername = receiverUsername;
    }

    // Getters and Setters
    public String getReceiverEmail() {
        return receiverEmail;
    }

    public void setReceiverEmail(String receiverEmail) {
        this.receiverEmail = receiverEmail;
    }

    public String getReceiverUsername() {
        return receiverUsername;
    }

    public void setReceiverUsername(String receiverUsername) {
        this.receiverUsername = receiverUsername;
    }
}