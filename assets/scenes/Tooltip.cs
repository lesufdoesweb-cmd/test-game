using Godot;
using System;

public partial class Tooltip : Control
{
	public string title = "";
	public string description = "";

	[Export]

    public RichTextLabel richTextTitle;

	[Export]

	public RichTextLabel richTextDescription;

	// Called when the node enters the scene tree for the first time.
	public override void _Ready()
	{
		richTextTitle.Text = title;
		richTextDescription.Text = description;
	}

}
